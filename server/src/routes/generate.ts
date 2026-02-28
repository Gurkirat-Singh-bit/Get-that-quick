// ── Generate route — /api/generate ───────────────────────────────────────
//
// Stateless LLM proxy. The frontend sends the system prompt (from a
// template) and the conversation messages. The server forwards to the
// configured provider and streams the response back via SSE.

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { generateStream, generate, listProviderModels } from "../services/llm";
import type { GenerateRequest } from "@shared/types";

const generateRoute = new Hono();

generateRoute.post("/", async (c) => {
  const body = await c.req.json<GenerateRequest>();

  if (!body.systemPrompt) {
    return c.json({ ok: false, error: "systemPrompt is required" }, 400);
  }
  if (!body.messages?.length) {
    return c.json({ ok: false, error: "messages array is required" }, 400);
  }

  // ── Non-streaming ──
  if (!body.stream) {
    try {
      const content = await generate(body.systemPrompt, body.messages, {
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        thinkingEnabled: body.thinkingEnabled,
      });
      return c.json({ ok: true, data: { content } });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message ?? String(err) }, 500);
    }
  }

  // ── Streaming via SSE ──
  return streamSSE(c, async (stream) => {
    try {
      for await (const chunk of generateStream(
        body.systemPrompt,
        body.messages,
        {
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          thinkingEnabled: body.thinkingEnabled,
        }
      )) {
        await stream.writeSSE({ data: JSON.stringify({ content: chunk }) });
      }
      await stream.writeSSE({ data: "[DONE]" });
    } catch (err: any) {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ error: err.message ?? String(err) }),
      });
    }
  });
});

// List available models from a configured provider
generateRoute.get("/models/:provider", async (c) => {
  const provider = c.req.param("provider");
  try {
    const models = await listProviderModels(provider);
    return c.json({ ok: true, data: models });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message ?? String(err) }, 500);
  }
});

export default generateRoute;
