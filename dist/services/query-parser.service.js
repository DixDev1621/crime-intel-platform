"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUserQuery = parseUserQuery;
const API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL || "llama-3.3-70b-versatile";
async function parseUserQuery(question) {
    const prompt = `
Convert the user's crime database request into JSON.

Return ONLY valid JSON.

Example:

User:
Show open theft cases in Mysuru

Response:
{
  "district":"Mysuru",
  "crimeType":"Theft",
  "status":"OPEN",
  "limit":10
}

User:
${question}
`;
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0,
        }),
    });
    if (!response.ok) {
        return null;
    }
    const data = await response.json();
    try {
        return JSON.parse(data.choices[0].message.content);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=query-parser.service.js.map