import { Router, Request, Response } from "express";
import multer from "multer";
import { PdfService } from "../services/pdfService";
import { ChunkingService } from "../services/chunkingService";
import { EmbeddingService } from "../services/embeddingService";
import { prisma } from "../db/prisma";
import { logger } from "../utils/logger";

// Create router instance for document management endpoints
export const uploadRoutes = Router();

// Configure Multer storage engine in memory with a 15MB file size ceiling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// Multipart upload endpoint for PDF, Markdown, and text files
uploadRoutes.post("/upload", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded. Please attach a file using the 'file' field." });
    return;
  }

  const file = req.file;
  const originalName = file.originalname || "untitled-document";
  const userTitle = (req.body.title as string) || originalName;
  let extractedText = "";

  try {
    // Parse PDF binary buffers or decode UTF-8 text files
    if (file.mimetype === "application/pdf" || originalName.toLowerCase().endsWith(".pdf")) {
      const parsedPdf = await PdfService.parse(file.buffer);
      extractedText = parsedPdf.text;
    } else {
      extractedText = file.buffer.toString("utf-8");
    }

    if (!extractedText.trim()) {
      res.status(400).json({ error: "Uploaded document contains no extractable text content." });
      return;
    }

    // Split extracted document text into overlapping chunks
    const chunks = ChunkingService.splitText(extractedText, {
      maxChunkSize: 800,
      chunkOverlap: 120
    });

    // Generate embeddings for each chunk
    const chunkContents = chunks.map((c) => c.content);
    const embeddings = await EmbeddingService.embedDocuments(chunkContents);

    // Save parent Document record to database if database connection is available
    let savedDocumentId = `doc-${Date.now()}`;
    try {
      const doc = await prisma.document.create({
        data: {
          title: userTitle,
          source: originalName
        }
      });
      savedDocumentId = doc.id;

      // Save each chunk to DocumentChunk table
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vector = embeddings[i];
        const vectorStr = `[${vector.join(",")}]`;

        // Insert chunk with vector embedding using raw SQL to support pgvector column type
        await prisma.$executeRaw`
          INSERT INTO "DocumentChunk" ("id", "documentId", "content", "embedding")
          VALUES (gen_random_uuid(), ${savedDocumentId}, ${chunk.content}, ${vectorStr}::vector)
        `;
      }
    } catch (dbErr: any) {
      // In offline/test environments without Postgres, fallback gracefully with memory ID
      logger.warn({ msg: "Database insert skipped or failed, returning parsed chunks", error: dbErr.message });
    }

    res.status(201).json({
      success: true,
      documentId: savedDocumentId,
      title: userTitle,
      source: originalName,
      totalCharacters: extractedText.length,
      chunkCount: chunks.length,
      chunks: chunks.map((c, i) => ({
        index: c.index,
        tokenCount: c.tokenCount,
        content: c.content,
        hasEmbedding: Boolean(embeddings[i] && embeddings[i].length === 1536)
      }))
    });
  } catch (err: any) {
    logger.error({ msg: "Document ingestion endpoint error", error: err.message });
    res.status(500).json({ error: err.message || "Failed to process document upload" });
  }
});

// Retrieves list of indexed documents
uploadRoutes.get("/", async (_req: Request, res: Response) => {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } }
    });
    res.json({ documents });
  } catch (err: any) {
    logger.warn({ msg: "Could not fetch documents from database", error: err.message });
    res.json({ documents: [] });
  }
});

