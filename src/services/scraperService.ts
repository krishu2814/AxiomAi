import * as cheerio from "cheerio";
import crypto from "crypto";
import { CacheService } from "./cacheService";
import { logger } from "../utils/logger";

// Clean structured content extracted from an external web page
export interface ScrapedContent {
  url: string;
  title: string;
  text: string;
  excerpt: string;
  links: string[];
  scrapedAt: string;
}

// Configuration options controlling HTTP timeouts and content thresholds
export interface ScraperOptions {
  timeoutMs?: number;
  maxContentLength?: number;
}

// Service responsible for downloading, parsing, and sanitizing web pages
export class ScraperService {
  // Scrapes and sanitizes web content from a given URL with automatic caching
  public static async scrapeUrl(url: string, options: ScraperOptions = {}): Promise<ScrapedContent> {
    const timeoutMs = options.timeoutMs ?? 10000;
    const maxContentLength = options.maxContentLength ?? 50000;

    // Validate URL scheme
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      throw new Error(`Invalid URL scheme: "${url}". Must begin with http:// or https://`);
    }

    // Check Redis or in-memory cache to prevent redundant HTTP network fetches
    const cacheKey = `scrape:${crypto.createHash("sha256").update(url).digest("hex")}`;
    const cached = await CacheService.get<ScrapedContent>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch target HTML with custom User-Agent and timeout abort signal
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AxiomAi-ResearchBot/1.0; +https://github.com/krishu2814/AxiomAi)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const parsed = this.extractHtml(html, url, maxContentLength);

      // Cache extracted page content for 24 hours
      await CacheService.set(cacheKey, parsed, 86400);

      return parsed;
    } catch (err: any) {
      logger.error({ msg: "Web scraping failed for URL", url, error: err.message });
      throw new Error(`Failed to scrape URL ${url}: ${err.message}`);
    }
  }

  // Parses raw HTML string and extracts cleaned title, body text, and links
  public static extractHtml(html: string, sourceUrl = "", maxContentLength = 50000): ScrapedContent {
    const $ = cheerio.load(html);

    // Remove boilerplate elements that introduce noise into research context
    $("script, style, noscript, svg, nav, footer, header, aside, iframe, form, button").remove();

    // Extract title prioritizing OpenGraph tags, title element, or top headline
    const ogTitle = $('meta[property="og:title"]').attr("content");
    const docTitle = $("title").text();
    const h1Title = $("h1").first().text();
    const title = (ogTitle || docTitle || h1Title || "Untitled Page").trim();

    // Select primary content container or fall back to document body
    const mainContainer = $("article, main, [role='main']").first();
    const targetElement = mainContainer.length > 0 ? mainContainer : $("body");

    // Extract text and normalize multiple spaces and linebreaks into clean prose
    const rawText = targetElement.text() || $("body").text() || "";
    const cleanText = rawText
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ ]{2,}/g, " ")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim();

    // Cap output text length to avoid token explosion
    const truncatedText = cleanText.slice(0, maxContentLength);

    // Create a 200-character summary excerpt appending ellipsis if original text exceeds 200 chars
    const excerpt = cleanText.slice(0, 200).replace(/\n/g, " ").trim() + (cleanText.length > 200 ? "..." : "");

    // Extract unique absolute hyperlinks from the page
    const linksSet = new Set<string>();
    $("a[href]").each((_i, elem) => {
      const href = $(elem).attr("href");
      if (href) {
        try {
          const absoluteUrl = sourceUrl ? new URL(href, sourceUrl).toString() : href;
          if (absoluteUrl.startsWith("http://") || absoluteUrl.startsWith("https://")) {
            linksSet.add(absoluteUrl);
          }
        } catch {
          // Ignore invalid URL strings
        }
      }
    });

    return {
      url: sourceUrl,
      title,
      text: truncatedText,
      excerpt,
      links: Array.from(linksSet).slice(0, 50),
      scrapedAt: new Date().toISOString()
    };
  }
}
