import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { Law, ChecklistItem } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeOrganization(answers: Record<string, string | string[]>): Promise<Law[]> {
  const prompt = `Du är en svensk expert på compliance, arbetsmiljö och ISO-standarder.
En organisation har svarat på följande frågor om sin verksamhet:
${Object.entries(answers).map(([q, a]) => `- ${q}: ${Array.isArray(a) ? (a.length > 0 ? a.join(', ') : 'Inga valda') : (a || 'Ej angivet')}`).join('\n')}

Baserat på dessa svar, analysera vilka lagar (Lagar), föreskrifter (AFS) och eventuella ISO-standarder som är mest kritiska och applicerbara för just denna organisation.
Returnera en lista med de 10-15 viktigaste kraven de måste ha koll på.
Varje krav ska ha en tydlig titel, en sammanfattning av varför den gäller dem baserat på deras svar, och vilken typ det är.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING, description: 'Lagens, föreskriftens eller ISO-kravets namn' },
            summary: { type: Type.STRING, description: 'Kort sammanfattning av varför detta krav är relevant för organisationen baserat på deras svar' },
            url: { type: Type.STRING, description: 'Länk till källan om tillgänglig' },
            type: { type: Type.STRING, description: 'Antingen "Lag", "Föreskrift" eller "ISO-standard"' }
          },
          required: ['id', 'title', 'summary', 'type']
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error('Failed to parse analysis', e);
    return [];
  }
}

export async function fetchRequirements(type: 'laws' | 'regulations' | 'iso9001' | 'iso14001'): Promise<Law[]> {
  let prompt = '';
  
  if (type === 'laws') {
    prompt = 'Sök efter en extremt omfattande lista med arbetsmiljölagar och andra relevanta lagar från Sveriges Riksdag. Inkludera grundläggande lagar (Arbetsmiljölagen, Arbetstidslagen, Diskrimineringslagen, Sjuklönelagen, Föräldraledighetslagen, etc.). Returnera en detaljerad lista med upp till 50 lagar. Använd sökverktyget för att få aktuell information.';
  } else if (type === 'regulations') {
    prompt = 'Sök efter en extremt omfattande lista med föreskrifter från Arbetsmiljöverket (AFS). Inkludera alla specifika AFS-föreskrifter du kan hitta (t.ex. SAM AFS 2001:1, OSA AFS 2015:4, Belastningsergonomi, Kemiska arbetsmiljörisker, Buller, etc.). Returnera en detaljerad lista med upp till 100 föreskrifter. Använd sökverktyget för att få aktuell information.';
  } else if (type === 'iso9001') {
    prompt = 'Sök efter alla huvudkrav och kapitel från ISO 9001 (Kvalitetsledningssystem). Inkludera specifika ISO-krav (t.ex. ISO 9001: Ledarskap, Planering, Stöd, Verksamhet, Utvärdering av prestanda, Förbättring). Returnera en detaljerad lista med alla krav enligt ISO 9001. OBS: Eftersom ISO-standarder är upphovsrättsskyddade, ska du ge en sammanfattning av kraven i dina egna ord, och tydligt ange att detta är en sammanfattning och inte den officiella standardtexten. Använd sökverktyget för att få aktuell information.';
  } else if (type === 'iso14001') {
    prompt = 'Sök efter alla huvudkrav och kapitel från ISO 14001 (Miljöledningssystem). Inkludera specifika ISO-krav (t.ex. ISO 14001: Ledarskap, Planering, Stöd, Verksamhet, Utvärdering av prestanda, Förbättring). Returnera en detaljerad lista med alla krav enligt ISO 14001. OBS: Eftersom ISO-standarder är upphovsrättsskyddade, ska du ge en sammanfattning av kraven i dina egna ord, och tydligt ange att detta är en sammanfattning och inte den officiella standardtexten. Använd sökverktyget för att få aktuell information.';
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING, description: 'Lagens, föreskriftens eller ISO-kravets namn, t.ex. Arbetsmiljölagen (1977:1160) eller ISO 9001:2015 - Kap 5 Ledarskap' },
            summary: { type: Type.STRING, description: 'Kort sammanfattning av vad kravet/lagen innebär och vem den gäller' },
            url: { type: Type.STRING, description: 'Länk till källan om tillgänglig' },
            type: { type: Type.STRING, description: 'Antingen "Lag", "Föreskrift" eller "ISO-standard"' }
          },
          required: ['id', 'title', 'summary', 'type']
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error('Failed to parse requirements', e);
    return [];
  }
}

export async function generateChecklistForLaw(lawTitle: string, lawSummary: string): Promise<ChecklistItem[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `Skapa en extremt detaljerad, praktisk och genomförbar checklista för en svensk organisation för att uppfylla kraven i följande arbetsmiljöregelverk:\n\nTitel: ${lawTitle}\nSammanfattning: ${lawSummary}\n\nChecklistan ska innehålla konkreta åtgärder som en HR-chef, VD eller arbetsmiljöombud kan bocka av för att säkerställa full regelefterlevnad (compliance). Tänk igenom alla steg noggrant.`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            task: { type: Type.STRING, description: 'Kort och tydlig uppgift, t.ex. "Upprätta en skriftlig arbetsmiljöpolicy"' },
            description: { type: Type.STRING, description: 'Detaljerad beskrivning av hur uppgiften utförs, vilka dokument som krävs och hur man praktiskt går tillväga.' }
          },
          required: ['id', 'task', 'description']
        }
      }
    }
  });

  try {
    const items = JSON.parse(response.text || '[]');
    return items.map((item: any) => ({ ...item, isCompleted: false }));
  } catch (e) {
    console.error('Failed to parse checklist', e);
    return [];
  }
}
