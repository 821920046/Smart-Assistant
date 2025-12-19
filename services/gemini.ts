
import { GoogleGenAI, Type } from "@google/genai";
import { TodoItem, Priority } from "../types";

// Helper to get fresh AI instance
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractTasks(content: string): Promise<TodoItem[]> {
  try {
    const ai = getAI();
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

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      text: item.text,
      completed: false,
      priority: item.priority as Priority
    }));
  } catch (e) {
    console.error("Failed to extract tasks", e);
    return [];
  }
}

export async function suggestTags(content: string): Promise<string[]> {
  try {
    const ai = getAI();
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

    const tags = JSON.parse(response.text || "[]");
    return Array.isArray(tags) ? tags.map((tag: string) => tag.replace(/^#/, '')) : [];
  } catch (e) {
    console.error("Failed to suggest tags", e);
    return [];
  }
}

export async function refineText(content: string): Promise<string> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional writing assistant. Improve the following note for clarity, better grammar, and professional formatting. Keep the core meaning identical. 
      
      Note: "${content}"`,
    });
    return response.text || content;
  } catch (e) {
    console.error("Failed to refine text", e);
    return content;
  }
}

export async function generateSummary(memos: string[]): Promise<string> {
  if (memos.length === 0) return "目前没有足够的记录生成总结。";
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following notes into a concise, structured brief. Use bullet points for key themes and highlight any important deadlines or urgent tasks.
      
      Notes:
      ${memos.join('\n---\n')}`,
    });
    return response.text || "无法生成总结。";
  } catch (e) {
    console.error("Failed to generate summary", e);
    return "生成总结时发生错误，请稍后重试。";
  }
}
