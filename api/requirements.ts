import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.body;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  try {
    let prompt = '';
    if (type === 'laws') prompt = 'Lista de viktigaste arbetsmiljölagarna och relevanta lagar från Sveriges Riksdag. Returnera upp till 40 lagar.';
    else if (type === 'regulations') prompt = 'Lista de viktigaste föreskrifterna från Arbetsmiljöverket (AFS). Returnera upp till 60 föreskrifter.';
    else if (type === 'iso9001') prompt = 'Sammanfatta huvudkraven i ISO 9001 (Kvalitetsledning).';
    else if (type === 'iso14001') prompt = 'Sammanfatta huvudkraven i ISO 14001 (Miljöledning).';

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
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
}
