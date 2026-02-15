
import { GoogleGenAI, Type } from "@google/genai";
import { Coordinate, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanJsonString = (text: string) => {
  if (!text) return "";
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) return match[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    return text.substring(start, end + 1);
  }
  return text.replace(/```json|```/gi, "").trim();
};

export const geocodeLocation = async (query: string): Promise<{ coords: Coordinate; name: string } | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Encontre as coordenadas geográficas para: "${query}". Responda em JSON: { "lat": number, "lng": number, "name": string }.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            name: { type: Type.STRING },
          },
          required: ["lat", "lng", "name"]
        }
      }
    });

    const cleanedJson = cleanJsonString(response.text || "");
    const data = JSON.parse(cleanedJson);
    
    const lat = Number(data?.lat);
    const lng = Number(data?.lng);

    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        coords: { lat, lng },
        name: data.name || query
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

export const analyzeTerrain = async (locationName: string, coords: Coordinate, polygon?: Coordinate[]): Promise<AnalysisResult> => {
  try {
    let contextPrompt = `Analise a área em torno de ${locationName} (${coords.lat}, ${coords.lng}).`;
    
    if (polygon && polygon.length >= 3) {
      const polyStr = polygon.map(p => `[${p.lat}, ${p.lng}]`).join(", ");
      contextPrompt = `Você é um engenheiro de GPS geodésico de elite. Analise a área DELIMITADA pelo seguinte polígono de coordenadas: ${polyStr}. 
      Sua tarefa é encontrar o ponto EXATO (coordenada) OBRIGATORIAMENTE DENTRO desse polígono que seja perfeito para instalar uma base GNSS. 
      Considere: visão desimpedida do céu (limpeza de horizonte), ausência de superfícies refletoras próximas (multi-path), estabilidade do solo e maior altitude relativa dentro da área.`;
    } else {
      contextPrompt = `Você é um engenheiro de GPS geodésico de elite. Analise a área em torno de ${locationName} (${coords.lat}, ${coords.lng}). 
      Sua tarefa é encontrar o ponto EXATO (coordenada) num raio de 500m que seja perfeito para instalar uma base GNSS (visão desimpedida do céu, sem interferências multi-path, terreno estável e alto).`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `${contextPrompt}
      
      IMPORTANTE:
      - Atribua uma nota de 1 a 10 para o local escolhido baseado na qualidade técnica para GNSS.
      - Retorne em 'optimizedCoords' a coordenada exata desse ponto perfeito.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suitabilityScore: { type: Type.NUMBER, description: "Nota de 1 a 10 para o local" },
            rationale: { type: Type.STRING },
            suggestion: { type: Type.STRING },
            optimizedCoords: {
              type: Type.OBJECT,
              properties: {
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER }
              },
              required: ["lat", "lng"]
            }
          },
          required: ["suitabilityScore", "rationale", "suggestion", "optimizedCoords"]
        }
      }
    });

    const cleanedJson = cleanJsonString(response.text || "");
    const data = JSON.parse(cleanedJson);

    // Validação de segurança para garantir que optimizedCoords contenha números válidos
    const optimizedLat = Number(data.optimizedCoords?.lat);
    const optimizedLng = Number(data.optimizedCoords?.lng);

    if (isNaN(optimizedLat) || isNaN(optimizedLng)) {
      throw new Error("A IA retornou coordenadas inválidas (NaN).");
    }

    return {
      ...data,
      optimizedCoords: {
        lat: optimizedLat,
        lng: optimizedLng
      }
    };
  } catch (error) {
    console.error("Analysis error:", error);
    return {
      suitabilityScore: 1,
      rationale: "Erro na análise técnica.",
      suggestion: "Certifique-se de que a área é visível e tente novamente.",
      optimizedCoords: coords
    };
  }
};
