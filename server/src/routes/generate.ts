/**
 * @fileoverview HTTP routes for LLM text generation.
 *
 * A stateless proxy between the client and the AI provider.
 * The client sends the system prompt and conversation history;
 * the server forwards it to the configured provider and streams
 * the response back using Server-Sent Events (SSE).
 *
 * Base path: `/api/generate`
 *
 * @module routes/generate
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { generateStream, generate, listProviderModels } from "../services/llm";
import { GenerateRequestSchema } from "@shared/schemas";
import type { GenerateRequest } from "@shared/types";

const generateRoute = new Hono();

/**
 * `POST /api/generate`
 *
 * Forward a conversation to the configured AI provider.
 * Streams the response as SSE when `stream: true` is in the body,
 * otherwise returns the full text in one JSON response.
 */
generateRoute.post("/", async (c) => {
  const rawBody = await c.req.json();
  
  // Validate request body with Zod
  const parseResult = GenerateRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json({ 
      ok: false, 
      error: "Invalid request body", 
      details: parseResult.error.format() 
    }, 400);
  }
  
  const body = parseResult.data as GenerateRequest;

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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ ok: false, error: message }, 500);
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

/**
 * `GET /api/generate/models/:provider`
 *
 * Fetch the list of models available from a configured provider.
 * Uses the stored API key for the named provider.
 */
generateRoute.get("/models/:provider", async (c) => {
  const provider = c.req.param("provider");
  try {
    const models = await listProviderModels(provider);
    return c.json({ ok: true, data: models });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ ok: false, error: message }, 500);
  }
});

export default generateRoute;
