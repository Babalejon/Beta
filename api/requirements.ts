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
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    let prompt = '';
    if (type === 'laws') {
      prompt = 'Lista de 30-40 viktigaste lagarna från Sveriges Riksdag som rör arbetsmiljö, säkerhet och regelefterlevnad för företag. För varje lag, sätt fältet "type" till "Lag".';
    } else if (type === 'regulations') {
      prompt = 'Lista de 50-60 viktigaste föreskrifterna från Arbetsmiljöverket (AFS) som rör arbetsmiljö och säkerhet. För varje föreskrift, sätt fältet "type" till "Föreskrift".';
    } else if (type === 'iso9001') {
      prompt = 'Sammanfatta huvudkraven i ISO 9001 (Kvalitetsledning) uppdelat i dess olika kapitel och kravområden. För varje krav, sätt fältet "type" till "ISO-standard".';
    } else if (type === 'iso14001') {
      prompt = 'Sammanfatta huvudkraven i ISO 14001 (Miljöledning) uppdelat i dess olika kapitel och kravområden. För varje krav, sätt fältet "type" till "ISO-standard".';
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

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
              id: { type: Type.STRING, description: 'ID (t.ex. SFS/AFS-nr)' },
              title: { type: Type.STRING, description: 'Titel' },
              summary: { type: Type.STRING, description: 'Kort sammanfattning' },
              url: { type: Type.STRING, description: 'Länk' },
              type: { type: Type.STRING, description: '"Lag", "Föreskrift" eller "ISO-standard"' }
            },
            required: ['id', 'title', 'summary', 'type']
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
      res.status(500).json({ error: 'Failed to parse requirements data', details: parseError instanceof Error ? parseError.message : String(parseError) });
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch requirements', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}
