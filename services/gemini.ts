
import { GoogleGenAI, Type } from "@google/genai";
import { TodoItem, Priority } from "../types.js";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractTasks(content: string, forceTodo: boolean = false): Promise<TodoItem[]> {
  try {
    const ai = getAI();
    const systemPrompt = forceTodo 
      ? "The user wants to create a checklist. Extract every meaningful line as a separate actionable todo item."
      : "Extract actionable todo items from this note content. Assign priorities based on the content's urgency.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${systemPrompt} Use these priority labels: 'important', 'normal', 'secondary'. Output in JSON.
      Content: "${content}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ['important', 'normal', 'secondary'] }
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

export async function askAssistant(query: string, contextMemos: string[]): Promise<string> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `You are a helpful Personal Brain Assistant. Below are the user's notes. Answer their question based on these notes.
      
      USER NOTES:
      ${contextMemos.join('\n---\n')}
      
      QUESTION: "${query}"`,
    });
    return response.text || "我无法理解这个问题。";
  } catch (e) {
    return "对话发生错误，请重试。";
  }
}
