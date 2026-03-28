import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text, systemPrompt } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY が設定されていません" }, { status: 500 });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text }] }],
      }),
    }
  );

  const data = await response.json();
  const aiText: string | null =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

  return NextResponse.json({ aiText });
}
