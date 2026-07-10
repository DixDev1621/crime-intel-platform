export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

const API_KEY = process.env.AI_API_KEY!;
const MODEL = process.env.AI_MODEL || "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `
You are the AI Investigation Assistant for the Karnataka State Police Crime Intelligence Platform.

You help investigators analyze FIRs, crime trends, accused profiles, victims, police stations, hotspots and investigations.

Rules:
- Never invent information.
- Use database context whenever available.
- If the answer isn't in the supplied data, clearly state that.
- Keep responses concise and professional.
`;

export async function getChatCompletion(
  history: ChatTurn[],
  language: string = "en"
): Promise<string> {
  if (!API_KEY) {
    throw new Error("AI_API_KEY missing");
  }

  console.log("==================================");
  console.log("Using Groq model:", MODEL);
  console.log("==================================");

  const messages = [
    {
      role: "system",
      content:
        SYSTEM_PROMPT +
        (language !== "en"
          ? ` Respond in ${
              language === "ta"
                ? "Tamil"
                : language === "kn"
                ? "Kannada"
                : language
            }.`
          : ""),
    },
    ...history,
  ];

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 900,
      }),
    }
  );

  console.log("Groq Status:", response.status);

  if (!response.ok) {
    const err = await response.text();
    console.log("Groq Error:", err);
    throw new Error(`Groq API Error (${response.status}): ${err}`);
  }

  const data: any = await response.json();

  return (
    data.choices?.[0]?.message?.content ??
    "No response received from Groq."
  );
}