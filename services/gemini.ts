
import { GoogleGenAI, Type } from "@google/genai";
import { TodoItem, Priority } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractTasks(content: string): Promise<TodoItem[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract actionable todo items from this note content. Assign a priority (low, medium, high) based on the tone or keywords. Output in JSON format.
    
    Content: "${content}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            priority: { 
              type: Type.STRING,
              enum: ['low', 'medium', 'high']
            }
          },
          required: ["text", "priority"]
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text);
    return data.map((item: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      text: item.text,
      completed: false,
      priority: item.priority as Priority
    }));
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
}

export async function suggestTags(content: string): Promise<string[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Suggest 1-3 short hashtags for this note. Output as a simple JSON array of strings. Content: "${content}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text).map((tag: string) => tag.replace(/^#/, ''));
  } catch {
    return [];
  }
}

export async function refineText(content: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a professional writing assistant. Improve the following note for clarity, better grammar, and professional formatting. Keep the core meaning identical. 
    
    Note: "${content}"`,
  });
  return response.text || content;
}

export async function generateSummary(memos: string[]): Promise<string> {
  if (memos.length === 0) return "目前没有足够的记录生成总结。";
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Summarize the following notes into a concise, structured brief. Use bullet points for key themes and highlight any important deadlines or urgent tasks.
    
    Notes:
    ${memos.join('\n---\n')}`,
  });
  return response.text || "无法生成总结。";
}
