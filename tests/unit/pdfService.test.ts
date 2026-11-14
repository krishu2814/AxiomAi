import { describe, it, expect } from "vitest";
import { PdfService } from "../../src/services/pdfService";

// Tests for PDF document extraction service
describe("PdfService", () => {
  // Verifies error when empty buffer is passed
  it("should throw an error when provided with an empty buffer", async () => {
    await expect(PdfService.parse(Buffer.from(""))).rejects.toThrow("Cannot parse empty PDF buffer");
  });

  // Verifies error when invalid non-pdf binary data is passed
  it("should throw an informative error when parsing corrupted PDF binary data", async () => {
    const invalidBuffer = Buffer.from("THIS_IS_NOT_A_VALID_PDF_DOCUMENT");
    await expect(PdfService.parse(invalidBuffer)).rejects.toThrow("Failed to extract text from PDF");
  });
});

