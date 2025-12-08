
import { GoogleGenAI, Type } from "@google/genai";
import { Annotation, RectAnnotation } from "../types";

const simpleId = () => Math.random().toString(36).substring(2, 9);

const getApiKey = (): string | undefined => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Environment access failed");
  }
  return undefined;
};

export const analyzeImageForAnnotations = async (documentId: string, base64Image: string, width: number, height: number): Promise<Annotation[]> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error("API Key not found. Please ensure process.env.API_KEY is set.");
    throw new Error("API Key not found in environment");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Clean base64 string
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  const prompt = `
    Analyze this document or image. Identify up to 5 key objects, text sections, or areas of interest.
    Return a JSON list of bounding boxes.
    For coordinates, use absolute pixel values based on an image size of width: ${width} and height: ${height}.
    If you are unsure of exact pixels, estimate based on a standard coordinate system and I will scale it, but prefer absolute.
    Provide a short 'label' for each box.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  ymin: { type: Type.NUMBER, description: "Top Y coordinate in pixels" },
                  xmin: { type: Type.NUMBER, description: "Left X coordinate in pixels" },
                  ymax: { type: Type.NUMBER, description: "Bottom Y coordinate in pixels" },
                  xmax: { type: Type.NUMBER, description: "Right X coordinate in pixels" },
                },
                required: ["label", "ymin", "xmin", "ymax", "xmax"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const result = JSON.parse(jsonText);
    const annotations: Annotation[] = [];

    if (result.items && Array.isArray(result.items)) {
      result.items.forEach((item: any) => {
        // Ensure coordinates are within bounds
        const x = Math.max(0, item.xmin);
        const y = Math.max(0, item.ymin);
        const w = Math.min(width - x, item.xmax - item.xmin);
        const h = Math.min(height - y, item.ymax - item.ymin);

        const rect: RectAnnotation = {
          id: simpleId(),
          documentId,
          type: 'rect',
          x: x,
          y: y,
          width: w,
          height: h,
          color: '#ef4444', // Default red for auto-detected
          strokeWidth: 4,
          label: item.label
        };
        annotations.push(rect);
      });
    }

    return annotations;

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    throw error;
  }
};
