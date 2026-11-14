import { Response } from "express";

// Data structure representing a typed Server-Sent Event message
export interface SSEEventData {
  event: string;
  data: Record<string, any> | string | number | boolean | null;
  id?: string;
  retry?: number;
}

// Configures HTTP headers required for persistent SSE connection streaming
export function initSSEHeaders(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  // Prevent proxy servers and Nginx from buffering partial chunks
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

// Formats and writes a single SSE event frame to the response stream
export function writeSSEEvent(res: Response, event: string, data: any, id?: string): void {
  if (res.writableEnded || res.destroyed) return;
  if (id) {
    res.write(`id: ${id}\n`);
  }
  res.write(`event: ${event}\n`);
  res.write(`data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`);
}

// Keeps SSE connection alive across firewalls by sending periodic comment pings
export function sendSSEHeartbeat(res: Response, intervalMs = 15000): NodeJS.Timeout {
  return setInterval(() => {
    if (!res.writableEnded && !res.destroyed) {
      res.write(": heartbeat\n\n");
    }
  }, intervalMs);
}

