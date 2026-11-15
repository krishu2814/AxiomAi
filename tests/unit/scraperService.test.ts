import { describe, it, expect, beforeEach } from "vitest";
import { ScraperService } from "../../src/services/scraperService";
import { CacheService } from "../../src/services/cacheService";

// Tests for HTML scraper and content sanitizer service
describe("ScraperService", () => {
  beforeEach(async () => {
    await CacheService.clear();
  });

  // Verifies error when invalid URL protocol is passed
  it("should throw error for invalid URL schemes", async () => {
    await expect(ScraperService.scrapeUrl("ftp://example.com")).rejects.toThrow("Invalid URL scheme");
    await expect(ScraperService.scrapeUrl("file:///local/path")).rejects.toThrow("Invalid URL scheme");
  });

  // Verifies parsing and stripping of boilerplate HTML elements
  it("should extract clean title, prose, and filter scripts/styles", () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Deep Research Agents Guide</title>
          <style>.ad { color: red; }</style>
          <script>console.log("tracking");</script>
        </head>
        <body>
          <nav><a href="/home">Home</a></nav>
          <main>
            <h1>Autonomous Research Workflows</h1>
            <p>LangGraph enables stateful multi-agent architectures with human-in-the-loop validation.</p>
            <p>Fact-checking models audit claims against collected source snippets.</p>
            <a href="https://example.com/reference">External Reference</a>
          </main>
          <footer>Copyright 2026</footer>
        </body>
      </html>
    `;

    const parsed = ScraperService.extractHtml(rawHtml, "https://example.com/guide");

    expect(parsed.title).toBe("Deep Research Agents Guide");
    expect(parsed.text).toContain("Autonomous Research Workflows");
    expect(parsed.text).toContain("LangGraph enables stateful multi-agent architectures");
    expect(parsed.text).not.toContain("console.log");
    expect(parsed.text).not.toContain(".ad { color: red; }");
    expect(parsed.text).not.toContain("Copyright 2026");
    expect(parsed.links).toContain("https://example.com/reference");
    expect(parsed.excerpt.length).toBeGreaterThan(0);
  });

  // Verifies prioritization of OpenGraph title over standard tag
  it("should prioritize OpenGraph title tag when present", () => {
    const rawHtml = `
      <html>
        <head>
          <title>Fallback Title</title>
          <meta property="og:title" content="OpenGraph High Priority Title" />
        </head>
        <body>
          <p>Sample body text</p>
        </body>
      </html>
    `;

    const parsed = ScraperService.extractHtml(rawHtml, "https://example.com");
    expect(parsed.title).toBe("OpenGraph High Priority Title");
  });

  // Verifies content truncation when maxContentLength option is applied
  it("should truncate output text according to maxContentLength limit", () => {
    const rawHtml = `<html><body><p>${"A".repeat(1000)}</p></body></html>`;
    const parsed = ScraperService.extractHtml(rawHtml, "https://example.com", 200);

    expect(parsed.text.length).toBeLessThanOrEqual(200);
    expect(parsed.excerpt.endsWith("...")).toBe(true);
  });
});

