import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, summary } = req.body;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Skapa en detaljerad, praktisk och genomförbar checklista för en svensk organisation för att uppfylla kraven i:\n\nTitel: ${title}\nSammanfattning: ${summary}`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              task: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['id', 'task', 'description']
          }
        }
      }
    });

    res.status(200).json(JSON.parse(response.text || '[]'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate checklist' });
  }
}
