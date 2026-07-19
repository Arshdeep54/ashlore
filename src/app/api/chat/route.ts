import { NextRequest } from "next/server";
import { createHash } from "crypto";
import Database from "better-sqlite3";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadConfig } from "@/core/config/loader";

const SYSTEM_PROMPT = `You are querying a developer's personal knowledge graph called ashlore.
Answer based on the work history context below. Be direct — 2-4 sentences unless asked for detail.
Cite dates and projects. If context lacks enough info, say so.`;

function buildContext(db: Database.Database, query: string) {
  const safeQuery = query
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!safeQuery || safeQuery.length < 2) {
    return { context: '', sources: [] };
  }

  let results: { date: string; source: string; content: string; session_id: string; project: string }[] = [];

  try {
    results = db
      .prepare(
        `SELECT snippet(search_index, 3, '', '', '', 80) as snippet,
                date, source, content, session_id, project
         FROM search_index WHERE search_index MATCH ?
         ORDER BY rank LIMIT 12`
      )
      .all(safeQuery) as any[];
  } catch {
    return { context: '', sources: [] };
  }

  const sources = results.map((r) => ({
    date: r.date,
    source: r.source,
    project: r.project,
    session_id: r.session_id,
  }));

  const uniqueSources = sources.filter(
    (s, i, arr) => arr.findIndex((x) => x.session_id === s.session_id) === i
  );

  const context = results
    .map(
      (r) =>
        `[${r.date}] [${r.project ?? "unknown"}] ${r.content.slice(0, 500)}`
    )
    .join("\n\n");

  return { context, sources: uniqueSources.slice(0, 4) };
}

function hashQuery(query: string): string {
  return createHash("sha256").update(query).digest("hex").slice(0, 32);
}

async function callGeminiWithRetry(
  apiKey: string,
  modelId: string,
  systemPrompt: string,
  context: string,
  query: string,
  history: { role: string; content: string }[],
  maxRetries = 2
): Promise<{ stream: AsyncGenerator<string>; text: () => string }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  const prompt = `Context:\n${context}\n\nQuestion: ${query}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const chat = model.startChat({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
          role: "user" as const,
        },
        history: history.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      } as any);

      const result = await chat.sendMessageStream(prompt);
      let fullText = "";

      async function* streamGenerator() {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          fullText += text;
          yield text;
        }
      }

      return {
        stream: streamGenerator(),
        text: () => fullText,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;

      if (msg.includes("429") || msg.includes("quota") || msg.includes("exceeded")) {
        const retryMatch = msg.match(/retry in (\d+)/i);
        const seconds = retryMatch?.[1];
        const waitMs = seconds ? parseInt(seconds, 10) * 1000 + 1000 : (attempt + 1) * 4000;
        console.log(`[ashlore] Rate limited, retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error("Gemini API call failed after retries");
}

export async function POST(request: NextRequest) {
  const dbPath = path.join(process.cwd(), "knowledge.db");
  const db = new Database(dbPath, { readonly: true });

  try {
    const body = await request.json();
    const query = (body.query ?? "").trim();
    const modelId = (body.modelId as string) ?? "gemini-2.5-flash";

    if (!query) {
      db.close();
      return new Response(JSON.stringify({ error: "Missing query" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const config = loadConfig();
    const apiKey = config.llm.apiKey ?? process.env.GEMINI_API_KEY;

    if (!apiKey) {
      db.close();
      return new Response(JSON.stringify({ error: "Gemini API key not configured. Set GEMINI_API_KEY in .env" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const { context, sources } = buildContext(db, query);
    const contextHash = hashQuery(context + modelId);
    const queryHash = hashQuery(query + modelId);

    const cached = db
      .prepare("SELECT answer FROM answer_cache WHERE query_hash = ? AND model_id = ?")
      .get(queryHash, modelId) as { answer: string } | undefined;

    if (cached) {
      db.prepare("UPDATE answer_cache SET hit_count = hit_count + 1 WHERE query_hash = ?").run(queryHash);
      db.close();

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", text: cached.answer })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", sources, cacheHit: true })}\n\n`));
          controller.close();
        },
      });

      return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
    }

    db.close();

    const history = (body.history ?? []) as { role: string; content: string }[];

    const { stream: geminiStream } = await callGeminiWithRetry(
      apiKey,
      modelId,
      SYSTEM_PROMPT,
      context.length ? context : "No specific context found for this query.",
      query,
      history
    );

    const encoder = new TextEncoder();
    let fullAnswer = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of geminiStream) {
            fullAnswer += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", text: chunk })}\n\n`));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", sources, cacheHit: false })}\n\n`));

          const writeDb = new Database(dbPath);
          writeDb
            .prepare("INSERT OR REPLACE INTO answer_cache (query_hash, query, answer, model_id, context_hash) VALUES (?, ?, ?, ?, ?)")
            .run(queryHash, query, fullAnswer, modelId, contextHash);
          writeDb.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Stream failed";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    db.close();
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Chat failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
