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

  const { title, summary } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `Skapa en detaljerad, praktisk och genomförbar checklista för en svensk organisation för att uppfylla kraven i:\n\nTitel: ${title}\nSammanfattning: ${summary}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'Ett unikt ID för checklist-objektet' },
              task: { type: Type.STRING, description: 'Själva uppgiften som ska utföras' },
              description: { type: Type.STRING, description: 'En mer detaljerad förklaring av uppgiften' }
            },
            required: ['id', 'task', 'description']
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      console.error('Empty response from Gemini');
      return res.status(200).json([]);
    }

    try {
      const data = JSON.parse(text);
      res.status(200).json(data);
    } catch (parseError) {
      console.error('Failed to parse JSON:', text);
      res.status(500).json({ error: 'Failed to parse checklist data', details: parseError instanceof Error ? parseError.message : String(parseError) });
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ 
      error: 'Failed to generate checklist', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}
