import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { answers } = req.body;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  try {
    const prompt = `Du är en svensk expert på compliance, arbetsmiljö och ISO-standarder.
En organisation har svarat på följande frågor om sin verksamhet:
${Object.entries(answers).map(([q, a]) => `- ${q}: ${Array.isArray(a) ? (a.length > 0 ? a.join(', ') : 'Inga valda') : (a || 'Ej angivet')}`).join('\n')}

Baserat på dessa svar, analysera vilka lagar (Lagar), föreskrifter (AFS) och eventuella ISO-standarder som är mest kritiska och applicerbara för just denna organisation.
Returnera en lista med de 10-15 viktigaste kraven de måste ha koll på.
Varje krav ska ha en tydlig titel, en sammanfattning av varför den gäller dem baserat på deras svar, och vilken typ det är.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              url: { type: Type.STRING },
              type: { type: Type.STRING }
            },
            required: ['id', 'title', 'summary', 'type']
          }
        }
      }
    });

    res.status(200).json(JSON.parse(response.text || '[]'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to analyze' });
  }
}
