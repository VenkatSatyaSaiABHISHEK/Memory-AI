import { NextRequest, NextResponse } from "next/server";
import { callGroq } from "@/lib/groq";

export async function POST(request: NextRequest) {
  try {
    const { query: searchQuery, memories } = await request.json();

    if (!searchQuery || typeof searchQuery !== "string" || !searchQuery.trim()) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 }
      );
    }

    if (!memories || !Array.isArray(memories)) {
      return NextResponse.json(
        { error: "Memories array is required." },
        { status: 400 }
      );
    }

    if (memories.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Format memories list for model reasoning context (keep text lightweight for speed)
    const contextList = memories.map((m: any) => ({
      id: m.id,
      title: m.title,
      content: m.content.slice(0, 300), // Truncate content slightly to reduce token count and save latency
      tags: m.tags || [],
      category: m.category,
    }));

    const systemPrompt = `You are an AI semantic search agent. Given the query and a list of user memories, identify which memories are conceptually, contextually, or semantically relevant to the query.
Avoid strict keyword matching. Think about topics, synonyms, and intent.

Return a JSON object with exactly one key "matches", containing an array of objects. Each object must have:
1. "id": The exact string ID of the matching memory.
2. "relevance": A confidence score from 0.5 to 1.0. Do not include items with scores below 0.5.
3. "explanation": A very brief, one-sentence description explaining why this memory matches the query.

Do not wrap the JSON in markdown codeblocks.`;

    const payloadText = JSON.stringify({
      query: searchQuery.trim(),
      memories: contextList,
    });

    const result = await callGroq({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: payloadText },
      ],
      model: "llama-3.1-8b-instant", // Use faster 8b model for search reranking to improve performance
      temperature: 0.1,
      jsonMode: true,
    });

    return NextResponse.json({
      matches: Array.isArray(result.matches) ? result.matches : []
    });

  } catch (error: any) {
    console.error("AI smart search failure:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during AI search indexing." },
      { status: 500 }
    );
  }
}
