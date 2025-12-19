
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TodoItem, Priority } from "../types.js";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API_KEY is not defined in process.env");
  }
  return new GoogleGenAI({ apiKey });
};

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

    const text = response.text || "[]";
    const data = JSON.parse(text);
    return data.map((item: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      text: item.text,
      completed: false,
      priority: item.priority as Priority
    }));
  } catch (e) {
    console.error("extractTasks failed:", e);
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
    const text = response.text || "[]";
    const tags = JSON.parse(text);
    return tags.map((tag: string) => tag.replace(/^#/, ''));
  } catch (e) {
    console.error("suggestTags failed:", e);
    return [];
  }
}

export async function askAssistant(query: string, contextMemos: string[]): Promise<string> {
  try {
    const ai = getAI();
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
