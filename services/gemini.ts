
import { GoogleGenAI, Type } from "@google/genai";
import { TodoItem, Priority } from "../types.js";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractTasks(content: string): Promise<TodoItem[]> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract actionable todo items from this note content. Assign a priority (low, medium, high). Output in JSON.
      Content: "${content}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
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
    return [];
  }
}

export async function suggestTags(content: string): Promise<string[]> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 1-3 tags for this note. Output JSON array. Content: "${content}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    const tags = JSON.parse(response.text || "[]");
    return tags.map((tag: string) => tag.replace(/^#/, ''));
  } catch (e) {
    return [];
  }
}

export async function refineText(content: string): Promise<string> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Improve this note for clarity and professional formatting. Keep original meaning.
      Note: "${content}"`,
    });
    return response.text || content;
  } catch (e) {
    return content;
  }
}

export async function generateSummary(memos: string[]): Promise<string> {
  if (memos.length === 0) return "目前没有足够的记录生成总结。";
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize these notes into a concise brief with bullet points. 
      Notes: ${memos.join('\n---\n')}`,
    });
    return response.text || "无法生成总结。";
  } catch (e) {
    return "生成总结时发生错误。";
  }
}

export async function askAssistant(query: string, contextMemos: string[]): Promise<string> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `You are a helpful Personal Brain Assistant. Below are the user's notes. Answer their question based on these notes. If the answer isn't in the notes, say you don't know but offer general advice.
      
      USER NOTES:
      ${contextMemos.join('\n---\n')}
      
      QUESTION: "${query}"`,
    });
    return response.text || "我无法理解这个问题。";
  } catch (e) {
    return "对话发生错误，请重试。";
  }
}
