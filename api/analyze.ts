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

  const { answers } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const prompt = `Du är en svensk expert på compliance, arbetsmiljö och ISO-standarder.
En organisation har svarat på följande frågor om sin verksamhet:
${Object.entries(answers).map(([q, a]) => `- ${q}: ${Array.isArray(a) ? (a.length > 0 ? a.join(', ') : 'Inga valda') : (a || 'Ej angivet')}`).join('\n')}

Baserat på dessa svar, analysera vilka lagar (Lagar), föreskrifter (AFS) och eventuella ISO-standarder som är mest kritiska och applicerbara för just denna organisation.
Returnera en lista med de 10-15 viktigaste kraven de måste ha koll på.
Varje krav ska ha en tydlig titel, en sammanfattning av varför den gäller dem baserat på deras svar, och vilken typ det är.
Fältet "type" MÅSTE vara antingen "Lag", "Föreskrift" eller "ISO-standard".`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'Ett unikt ID, t.ex. SFS-nummer eller AFS-nummer' },
              title: { type: Type.STRING, description: 'Namnet på lagen eller föreskriften' },
              summary: { type: Type.STRING, description: 'En kort sammanfattning av varför den är relevant' },
              url: { type: Type.STRING, description: 'Länk till officiell källa om tillgänglig' },
              type: { type: Type.STRING, description: 'MÅSTE vara antingen "Lag", "Föreskrift" eller "ISO-standard"' }
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
      res.status(500).json({ error: 'Failed to parse analysis data', details: parseError instanceof Error ? parseError.message : String(parseError) });
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}
