
import { GoogleGenAI, Type } from "@google/genai";
import { Note, Player } from '../types';

// Fix: Directly use process.env.API_KEY in the GoogleGenAI constructor as required by guidelines
const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.error("API Key not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateScoutingReport = async (player: Player, notes: Note[]): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Error: Falta la clave API.";

  const playerDetails = `
    Jugador: ${player.name}
    Posición: ${player.position}
    Edad: ${player.age}
    Equipo: ${player.team}
    Estadísticas: Ritmo: ${player.stats.pace}, Tiro: ${player.stats.shooting}, Pase: ${player.stats.passing}, Regate: ${player.stats.dribbling}, Defensa: ${player.stats.defending}, Físico: ${player.stats.physical}
  `;

  const notesText = notes.map(n => `- [${n.category}] ${n.content} (Etiquetas: ${n.tags.join(', ')})`).join('\n');

  const prompt = `
    Eres un asistente de scouting de fútbol de clase mundial.
    Analiza el siguiente perfil de jugador y notas de scouting para generar un Informe de Scouting conciso pero completo en ESPAÑOL.
    
    ${playerDetails}
    
    Notas del Scout:
    ${notesText}
    
    El informe debe tener las siguientes secciones:
    1. **Resumen Ejecutivo**: Una breve visión general del nivel actual y potencial del jugador.
    2. **Fortalezas Clave**: Derivadas de las notas y estadísticas.
    3. **Áreas de Mejora**: Derivadas de las notas y estadísticas.
    4. **Encaje Táctico**: Dónde encaja mejor en un sistema moderno.
    5. **Veredicto Final**: ¿Deberíamos ficharlo?
    
    Formato usando Markdown. Mantén un tono profesional, objetivo y perspicaz. Responde únicamente en español.
  `;

  try {
    // Fix: Call generateContent with both model name and prompt/contents directly
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    // Fix: Access .text as a property (not a method)
    return response.text || "No se pudo generar el informe.";
  } catch (error) {
    console.error("Error generating report:", error);
    return "Error generando el informe. Por favor verifica tu clave API e inténtalo de nuevo.";
  }
};

export const suggestNoteTags = async (content: string): Promise<string[]> => {
  const ai = getAiClient();
  if (!ai) return [];

  const prompt = `
    Analiza esta nota de scouting de fútbol y sugiere hasta 3 etiquetas cortas y relevantes en ESPAÑOL (ej. 'Finalización', 'Ritmo', 'Trabajo', 'Riesgo de Lesión').
  `;

  try {
    // Fix: Call generateContent with both model name and contents directly
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${prompt}\nNota: "${content}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });
    
    // Fix: Access .text property directly and trim whitespace
    const text = response.text?.trim();
    if (!text) return [];
    
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Error suggesting tags:", error);
    return [];
  }
};
