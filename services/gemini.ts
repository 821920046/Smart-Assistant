
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TodoItem, Priority } from "../types.js";

import { useStore } from './store';

const getAI = () => {
  const storeApiKey = useStore.getState().geminiApiKey;
  const envApiKey = process.env.API_KEY;
  const apiKey = storeApiKey || envApiKey;

  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export async function analyzeNote(content: string): Promise<{ todos: TodoItem[], tags: string[] }> {
  try {
    const ai = getAI();
    if (!ai) return { todos: [], tags: [] };

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: `Perform a deep analysis of this personal note content.
      1. Extract actionable todo items.
      2. Suggest 2-3 relevant tags.
      
      Output in JSON format with keys "todos" and "tags".
      For "todos", each item should have "text" and "priority" (important/normal/secondary).
      
      Content: "${content}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            todos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['important', 'normal', 'secondary'] }
                },
                required: ["text", "priority"]
              }
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["todos", "tags"]
        }
      }
    });

    const text = response.text || "{\"todos\":[],\"tags\":[]}";
    const data = JSON.parse(text);

    const todos = data.todos.map((item: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      text: item.text,
      completed: false,
      priority: item.priority as Priority
    }));

    const tags = data.tags.map((tag: string) => tag.replace(/^#/, ''));

    return { todos, tags };
  } catch (e) {
    console.error("analyzeNote failed:", e);
    return { todos: [], tags: [] };
  }
}

export async function extractTasks(content: string, forceTodo: boolean = false): Promise<TodoItem[]> {
  const result = await analyzeNote(content);
  return result.todos;
}

export async function suggestTags(content: string): Promise<string[]> {
  const result = await analyzeNote(content);
  return result.tags;
}

export async function askAssistant(query: string, contextMemos: string[]): Promise<string> {
  try {
    const ai = getAI();
    if (!ai) return "请先配置 Gemini API Key 以使用 AI 助手功能。";
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `You are a helpful Personal Brain Assistant. Below are the user's notes. Answer their question based on these notes. If the notes don't have the answer, use Google Search to provide an accurate response.
      
      USER NOTES:
      ${contextMemos.join('\n---\n')}
      
      QUESTION: "${query}"`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text || "我无法理解这个问题。";
  } catch (e) {
    console.error("askAssistant failed:", e);
    return "对话发生错误，请确认网络连接或 API Key 是否正确。";
  }
}

export async function generateSpeech(text: string): Promise<string | undefined> {
  try {
    const ai = getAI();
    if (!ai) return undefined;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Please read this clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    console.error("TTS generation failed:", e);
    return undefined;
  }
}
