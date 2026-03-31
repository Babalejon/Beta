import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API Setup
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // API Routes
  app.post("/api/analyze", async (req, res) => {
    try {
      const { answers } = req.body;
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

      res.json(JSON.parse(response.text || '[]'));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze" });
    }
  });

  app.post("/api/requirements", async (req, res) => {
    try {
      const { type } = req.body;
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
      res.json(JSON.parse(response.text || '[]'));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch requirements" });
    }
  });

  app.post("/api/checklist", async (req, res) => {
    try {
      const { title, summary } = req.body;
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
      res.json(JSON.parse(response.text || '[]'));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate checklist" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
