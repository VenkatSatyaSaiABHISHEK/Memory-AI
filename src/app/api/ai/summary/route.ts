import { NextRequest, NextResponse } from "next/server";
import { callGroq } from "@/lib/groq";

export async function POST(request: NextRequest) {
  try {
    const { memories, type } = await request.json();

    if (!memories || !Array.isArray(memories)) {
      return NextResponse.json(
        { error: "Memories must be a valid array." },
        { status: 400 }
      );
    }

    const digestType = type === "weekly" ? "weekly digest" : "daily digest";

    if (memories.length === 0) {
      return NextResponse.json({
        summary: `### 🧠 AI Summary\n\nNo memory entries were logged during this period. Start writing logs to see an AI summary digest.`
      });
    }

    // Format memories for context
    const memoriesText = memories
      .map((m: any, index: number) => {
        return `Memory #${index + 1}:
Title: ${m.title}
Date: ${m.date} ${m.time}
Category: ${m.category}
Tags: ${(m.tags || []).join(", ")}
Content: ${m.content}
${m.summary ? `Summary: ${m.summary}` : ""}
---`;
      })
      .join("\n\n");

    const systemPrompt = `You are an AI personal assistant. Generate a cohesive, beautifully structured ${digestType} of the user's logged memories.
Synthesize the entries into a neat narrative summary:
- Group related items together.
- Highlight key accomplishments, insights gained, and task reminders.
- Use clean Markdown styling with headers, bold text, and lists where appropriate.
- Keep it encouraging, premium, and concise (120-220 words).

You MUST return a JSON object with a single key: "summary", which contains the markdown summary string. Do not wrap the JSON in markdown codeblocks.`;

    const result = await callGroq({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here are my logged memories for this period:\n\n${memoriesText}` },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      jsonMode: true,
    });

    return NextResponse.json({
      summary: result.summary || "Failed to generate summary digest."
    });

  } catch (error: any) {
    console.error("AI digest summary failure:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during AI summary generation." },
      { status: 500 }
    );
  }
}
