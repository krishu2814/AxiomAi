import pdfParse from "pdf-parse";
import { logger } from "../utils/logger";

// Structured representation of text and metadata parsed from a PDF file
export interface ParsedPDF {
  text: string;
  numPages: number;
  info?: Record<string, any>;
}

// Service responsible for extracting clean text and page metadata from PDF buffers
export class PdfService {
  // Extracts readable text and metadata from raw PDF binary buffer
  public static async parse(buffer: Buffer): Promise<ParsedPDF> {
    if (!buffer || buffer.length === 0) {
      throw new Error("Cannot parse empty PDF buffer");
    }

    try {
      // Execute pdf-parse extraction
      const data = await pdfParse(buffer);

      // Clean multiple consecutive blank lines and trim whitespace
      const sanitizedText = data.text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

      return {
        text: sanitizedText,
        numPages: data.numpages || 1,
        info: data.info || {}
      };
    } catch (err: any) {
      logger.error({ msg: "PDF parsing operation failed", error: err.message });
      throw new Error(`Failed to extract text from PDF: ${err.message}`);
    }
  }
}

