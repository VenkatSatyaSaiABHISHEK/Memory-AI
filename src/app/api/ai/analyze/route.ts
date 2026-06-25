import { NextRequest, NextResponse } from "next/server";
import { callGroq } from "@/lib/groq";

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required and must be a valid string." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an AI memory analyzer. Your task is to process a diary/log/memory entry from the user and extract/generate structured metadata.
Extract the following:
1. "title": A concise, descriptive title (3-6 words) that summarizes the entry.
2. "summary": A short summary (1-2 sentences) capturing the core of what happened.
3. "tags": An array of 2-4 lowercase semantic keyword tags.
4. "category": Choose the single category that best fits. Preference goes to "Note", "Activity", "Insight", or "Reminder". If none of these fit, generate a custom single-word category (e.g. "Work", "Health", "Travel").

You MUST return a JSON object with exactly the keys: "title", "summary", "tags", and "category". Do not wrap the JSON in markdown codeblocks.`;

    const result = await callGroq({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content.trim() },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      jsonMode: true,
    });

    // Basic validation of fields
    const responseData = {
      title: result.title || "Untitled Memory",
      summary: result.summary || "No summary available.",
      tags: Array.isArray(result.tags) ? result.tags.map((t: any) => String(t).toLowerCase().trim()) : ["memory"],
      category: result.category || "Note",
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("AI memory analysis failure:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during AI analysis." },
      { status: 500 }
    );
  }
}
