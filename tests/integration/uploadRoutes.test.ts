import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Server } from "http";
import { app } from "../../src/index";

// Integration tests for document upload and ingestion endpoints
describe("Upload Routes Integration", () => {
  let server: Server;
  let baseUrl: string;

  // Spin up ephemeral HTTP server on random port before tests
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === "object") {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  // Cleanly close server after test suite finishes
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // Verifies document upload without a file returns 400 Bad Request
  it("should return 400 Bad Request when no file is uploaded", async () => {
    const res = await fetch(`${baseUrl}/api/documents/upload`, {
      method: "POST"
    });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("No file uploaded");
  });

  // Verifies uploading a markdown/text file creates chunks with embeddings
  it("should parse, chunk, and embed uploaded text documents", async () => {
    const fileContent = "# Scalable RAG Systems\n\nRetrieval-augmented generation grounds LLMs in external knowledge.";
    const form = new FormData();
    const blob = new Blob([fileContent], { type: "text/markdown" });
    form.append("file", blob, "rag-guide.md");
    form.append("title", "RAG Systems Architecture");

    const res = await fetch(`${baseUrl}/api/documents/upload`, {
      method: "POST",
      body: form
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.title).toBe("RAG Systems Architecture");
    expect(body.chunkCount).toBeGreaterThan(0);
    expect(body.chunks[0].hasEmbedding).toBe(true);
  });

  // Verifies GET /api/documents returns array of documents
  it("should list indexed documents from GET /api/documents", async () => {
    const res = await fetch(`${baseUrl}/api/documents`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.documents)).toBe(true);
  });
});

