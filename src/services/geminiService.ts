import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface FireDetectionReport {
  isFireDetected: boolean;
  isSmokeDetected: boolean;
  severity: "low" | "medium" | "high" | "none";
  source: string;
  location: string;
  confidence: number;
  reasoning: string;
}

export async function analyzeFootage(base64Image: string): Promise<FireDetectionReport> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze this CCTV footage frame for fire or smoke. 
  Distinguish between actual fire/smoke and benign sources like steam, sunset light, lamps, or reflections.
  Provide a detailed report in JSON format.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      isFireDetected: { type: Type.BOOLEAN },
      isSmokeDetected: { type: Type.BOOLEAN },
      severity: { type: Type.STRING, enum: ["low", "medium", "high", "none"] },
      source: { type: Type.STRING, description: "The specific object or area where the fire/smoke originates" },
      location: { type: Type.STRING, description: "The relative location within the frame (e.g., top-left, near the window)" },
      confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 1" },
      reasoning: { type: Type.STRING, description: "Brief explanation of why this was identified as fire/smoke or why it was dismissed as benign" }
    },
    required: ["isFireDetected", "isSmokeDetected", "severity", "source", "location", "confidence", "reasoning"]
  };

  const result = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema
    }
  });

  try {
    return JSON.parse(result.text || "{}") as FireDetectionReport;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("Invalid AI response format");
  }
}
