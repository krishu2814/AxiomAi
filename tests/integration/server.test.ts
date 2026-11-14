import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Server } from "http";
import { app } from "../../src/index";
import { initSSEHeaders, writeSSEEvent, sendSSEHeartbeat } from "../../src/utils/sse";

// Tests for Express HTTP server and Server-Sent Events utility
describe("Express Server & SSE Streaming", () => {
  let server: Server;
  let baseUrl: string;

  // Spin up an ephemeral HTTP server on random available port before tests run
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

  // Cleanly close ephemeral server after test suite completes
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // Verify GET /health responds with valid JSON and service status
  it("should respond with 200 OK from GET /health", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
    expect(body.services).toBeDefined();
    expect(typeof body.services.redis).toBe("boolean");
    expect(typeof body.services.database).toBe("boolean");
  });

  // Verify SSE headers configuration function sets correct streaming headers
  it("should configure correct streaming headers for SSE", () => {
    const headers: Record<string, string> = {};
    const mockRes: any = {
      setHeader: (key: string, val: string) => {
        headers[key] = val;
      },
      flushHeaders: () => {}
    };

    initSSEHeaders(mockRes);

    expect(headers["Content-Type"]).toBe("text/event-stream");
    expect(headers["Cache-Control"]).toBe("no-cache, no-transform");
    expect(headers["Connection"]).toBe("keep-alive");
    expect(headers["X-Accel-Buffering"]).toBe("no");
  });

  // Verify writing SSE event frames outputs the standard event stream protocol format
  it("should write structured SSE events into response stream", () => {
    let output = "";
    const mockRes: any = {
      writableEnded: false,
      destroyed: false,
      write: (chunk: string) => {
        output += chunk;
      }
    };

    writeSSEEvent(mockRes, "agent_thought", { step: "plan", detail: "decomposing query" }, "evt-1");

    expect(output).toContain("id: evt-1\n");
    expect(output).toContain("event: agent_thought\n");
    expect(output).toContain('data: {"step":"plan","detail":"decomposing query"}\n\n');
  });

  // Verify heartbeat interval emits SSE comment pings
  it("should send periodic keep-alive heartbeat comments", async () => {
    let heartbeatOutput = "";
    const mockRes: any = {
      writableEnded: false,
      destroyed: false,
      write: (chunk: string) => {
        heartbeatOutput += chunk;
      }
    };

    // Run short 50ms heartbeat interval for testing
    const timer = sendSSEHeartbeat(mockRes, 50);
    await new Promise((r) => setTimeout(r, 120));
    clearInterval(timer);

    expect(heartbeatOutput).toContain(": heartbeat\n\n");
  });
});

