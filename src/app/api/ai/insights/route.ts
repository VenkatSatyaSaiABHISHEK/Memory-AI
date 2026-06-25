import { NextRequest, NextResponse } from "next/server";
import { callGroq } from "@/lib/groq";

export async function POST(request: NextRequest) {
  try {
    const { memories } = await request.json();

    if (!memories || !Array.isArray(memories)) {
      return NextResponse.json(
        { error: "Memories must be a valid array." },
        { status: 400 }
      );
    }

    if (memories.length === 0) {
      return NextResponse.json({
        insights: ["Start logging memories to generate personal AI insights."],
        mood: "Neutral - No logs available",
        recommendations: ["Write a diary log entry about your day to begin."],
      });
    }

    // Format memories overview
    const contextList = memories.map((m: any) => ({
      title: m.title,
      category: m.category,
      tags: m.tags || [],
      content: m.content.slice(0, 150),
      date: m.date,
    }));

    const systemPrompt = `You are an AI personal coach and memory psychologist. Your goal is to analyze the user's logged memory entries over time to uncover qualitative insights, habits, core themes, and mood vibes.
Provide positive, constructive, and actionable feedback.

You MUST return a JSON object with exactly the keys:
1. "insights": An array of 3 key qualitative insights (bulleted observations) about what topics the user is focusing on or patterns in their lifestyle/thought.
2. "mood": A short summary string assessing their overall vibe (e.g. "Focus & Drive", "Reflective & Creative", "Busy & Task-oriented") and a brief reason why.
3. "recommendations": An array of 2 practical, personalized recommendations for self-improvement or task management based on their habits.

Do not wrap the JSON in markdown codeblocks.`;

    const result = await callGroq({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the log history:\n\n${JSON.stringify(contextList)}` },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      jsonMode: true,
    });

    return NextResponse.json({
      insights: Array.isArray(result.insights) ? result.insights : ["Analyze logs to extract custom patterns."],
      mood: result.mood || "Focused",
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : ["Log details to gain coaching tips."],
    });

  } catch (error: any) {
    console.error("AI insights failure:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during AI insights processing." },
      { status: 500 }
    );
  }
}
