// src/services/aiService.ts
// Quitar importación de @env
// import { OPENROUTER_API_KEY, AI_TEMPERATURE, AI_MAX_TOKENS, OPENROUTER_MODEL } from '@env';
// import axios from 'axios'; // Eliminado
// import { AIResponse } from '../types/chat'; // Eliminado
import { UserPreferences, User } from '../services/supabase'; // Se eliminó supabase de la importación, AÑADIDO User
// import { formatUserPreferences, getTemporalContextValues } from '../utils/promptUtils'; // Importar buildDynamicPrompt y las otras necesarias
// Eliminar la importación de generateEmbedding
// import { generateEmbedding } from './embeddingService';
// Volver a importar loadMessages y ChatMsg - Serán eliminadas porque no se usan
// import { saveMessage, ChatMsg } from '../hooks/useMessageMemory'; // Eliminado

// Importar Zep Service y tipos necesarios
// import { getZepMemory } from './zepService'; // Se eliminaron ZepMessage y GetMemoryResponse
import { getZepMemory, addMessageToSession } from './zepService';
import { getSystemStatusObject } from './cortexService';
import { getFamilyMemberDataByEmail } from './familyContext'; // Usar esta en su lugar

// --- IMPORTAR INSTRUCCIONES Y REGLAS (AHORA ESTÁTICO) ---
// import { systemInstructions } from '../ai/system'; // YA NO SE USAN
// import { behaviorRules } from '../ai/behavior'; // YA NO SE USAN
// import { systemInstructions2 } from '../ai/system2'; // YA NO SE USAN
// import { behaviorRules2 } from '../ai/behavior2'; // YA NO SE USAN

// --- IMPORTAR NUEVO CONSTRUCTOR DE PROMPT DE SISTEMA ---
import { generateSystemPromptForUser } from '../utils/systemBuilder';
import { messageStore } from './messageStore';
import { generateMessageId } from '../utils/id';
import { analizarYGenerarInferencia } from './centinelaService'; // <-- IMPORTAR CENTINELA
import Constants from 'expo-constants';

// Definir el error personalizado para la sesión expirada
export class SessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

// Definición del tipo Message para la IA (puede diferir de los tipos de UI)
export interface AIMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string; // o Date, según lo que espere la IA
  senderId: string;
  role: 'user' | 'assistant' | 'system';
  imageUrl?: string;
  localImageUri?: string | null; // URI local antes de subirla
  animateTyping?: boolean;
}

// Tipos para el historial de conversación que se envía a la IA
/* Eliminado porque no se usa
interface ConversationHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}
*/

// Las siguientes constantes ya no se usan directamente aquí, se accede a process.env más adelante.
// const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY!;
// const OPENROUTER_MODEL_NAME = process.env.EXPO_PUBLIC_OPENROUTER_MODEL || 'openai/gpt-4.1-mini';
// const API_BASE_URL = 'https://openrouter.ai/api/v1';

// Eliminar constantes y función de búsqueda de embeddings
// const MATCH_THRESHOLD = 0.80; 
// const MATCH_COUNT = 3; 
// const findSimilarMessages = async (...) => { ... };

const AI_ID = 'ai-lenor'; // ID para los mensajes generados por la IA

/**
 * Envía un mensaje a la IA, maneja la respuesta en streaming y actualiza el estado global.
 */
export const sendMessageToAI = async (
  message: AIMessage,
  userPreferences: UserPreferences | null,
  zepSessionId: string,
  explicitMemoryNotes: string | null,
  authUser: User | null,
  inputMode?: string
): Promise<string | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

  try {
    // Manejo de comandos de diagnóstico internos
    const diagnosticCommands = ['/diag', '/clear-debug'];
    if (diagnosticCommands.some(cmd => message.text.startsWith(cmd))) {
      // (La lógica de diagnóstico ya se maneja en otro lugar, esto previene la llamada a la IA)
      return null;
    }

    // 1. Construir el contexto para la IA
    const familyMemberData = authUser ? getFamilyMemberDataByEmail(authUser.email) : null;
    const userEmailForPrompt = authUser?.email || '';
    
    // --- INICIO: LÓGICA PARA NUEVOS USUARIOS ---
    let contextoFamiliarParaPrompt: string | undefined = undefined;
    if (!familyMemberData) {
      contextoFamiliarParaPrompt = `El usuario actual, ${userEmailForPrompt}, es un nuevo invitado por Ernesto Loeza. Ernesto es tu creador y la persona a la que sirves. La misión de LéNOR es ser un asistente digital y compañero para la familia de Ernesto y sus amigos. Dale la bienvenida al usuario, preséntate y explícale tu propósito.`;
    }
    // --- FIN: LÓGICA PARA NUEVOS USUARIOS ---

    const systemStatus = await getSystemStatusObject(zepSessionId);
    const systemStatusString = `Red: ${systemStatus.network}, Zep: ${systemStatus.zepFriendly}, DB: ${systemStatus.supabase}`;
    const currentDate = new Date();
    const appVersion = Constants.expoConfig?.version ?? 'N/A';
    const buildNumber = Constants.expoConfig?.ios?.buildNumber ?? 'N/A';

    const systemPrompt = generateSystemPromptForUser(
      familyMemberData, 
      userEmailForPrompt,
      systemStatusString,
      currentDate,
      userPreferences, 
      explicitMemoryNotes, 
      contextoFamiliarParaPrompt, // Aquí se pasa el contexto de fallback
      appVersion,
      buildNumber,
      inputMode
    );
    const zepMemory = await getZepMemory(zepSessionId);

    const systemMessage = { role: 'system', content: systemPrompt };
    const historyMessages = zepMemory?.messages?.map(m => ({ 
      role: m.role === 'ai' ? 'assistant' : m.role, 
      content: m.content 
    })) || [];
    
    // --- INICIO: INTEGRACIÓN DE CENTINELA ---
    const inferenciaCentinela = analizarYGenerarInferencia(
      { rawText: message.text }
    );

    let userMessageContent = message.text;
    if (inferenciaCentinela) {
      userMessageContent = `[INFERENCIA DE CENTINELA]: ${inferenciaCentinela}\n\n---\n\n[MENSAJE ORIGINAL DEL USUARIO]:\n${message.text}`;
    }
    // --- FIN: INTEGRACIÓN DE CENTINELA ---

    // Contenido del mensaje de usuario (puede ser multimodal)
    let userApiMessageContent: string | Array<{ type: string; text?: string; image_url?: { url: string }; }>;

    if (message.imageUrl) {
        userApiMessageContent = [
            { type: 'text', text: userMessageContent }, // Usar el contenido aumentado por Centinela
            { type: 'image_url', image_url: { url: message.imageUrl } }
        ];
    } else {
        userApiMessageContent = userMessageContent; // Usar el contenido (aumentado o no)
    }

    const userMessageForApi = { role: 'user', content: userApiMessageContent };
    
    const messagesForAPI = [systemMessage, ...historyMessages, userMessageForApi];

    const openRouterModel = process.env.EXPO_PUBLIC_OPENROUTER_MODEL || 'openai/gpt-4.1-mini';

    const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'LéNOR',
        'Referer': 'https://lenor.app',
        'X-OpenRouter-Client-Request-Id': message.id,
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: messagesForAPI,
        temperature: parseFloat(process.env.EXPO_PUBLIC_AI_TEMPERATURE || '0.69'),
        max_tokens: parseInt(process.env.EXPO_PUBLIC_AI_MAX_TOKENS || '3000', 10),
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error de OpenRouter: ${response.status} - ${errorText}`);
      throw new Error(`Error de OpenRouter: ${response.status} - ${errorText}`);
    }

    // 3. Procesar la respuesta (NO STREAM)
    const responseData = await response.json();

    // Revisar si la respuesta JSON contiene un error
    if (responseData.error) {
      const errorMessage = `Error en respuesta de OpenRouter: ${responseData.error.message || JSON.stringify(responseData.error)}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    const fullResponseText = responseData.choices?.[0]?.message?.content;

    if (!fullResponseText) {
      const errorMsg = 'La respuesta de OpenRouter fue exitosa pero no contenía texto de mensaje.';
      console.error(`${errorMsg}. Data: ${JSON.stringify(responseData)}`);
      // Añadir mensaje de error a la UI
      messageStore.addMessage({
        id: generateMessageId(AI_ID),
        text: "El asistente no generó una respuesta. Por favor, inténtalo de nuevo.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      return null;
    }

    const aiMessageId = generateMessageId(AI_ID);
    
    // Añadir el mensaje de la IA al messageStore de una sola vez
    messageStore.addMessage({
      id: aiMessageId,
      text: fullResponseText,
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    // 4. Persistir la conversación completa en la memoria de Zep
    if (zepSessionId) {
      const userTextForZep = message.text + (message.imageUrl ? ` [Imagen adjunta: ${message.imageUrl}]` : '');
      
      const messagesToPersist = [
        {
          message_id: message.id, // ID del mensaje original del usuario
          role: 'user',
          content: userTextForZep,
        },
        {
          message_id: aiMessageId, // ID generado para la respuesta de la IA
          role: 'assistant',
          content: fullResponseText,
        }
      ];

      // Hacer una sola llamada para persistir ambos mensajes
      for (const msg of messagesToPersist) {
          try {
              await addMessageToSession(zepSessionId, msg);
          } catch(e) {
              console.error(`aiService: Error al guardar mensaje individual en Zep: ${e}`);
              // Continuar intentando guardar otros mensajes
          }
      }
    }

    return fullResponseText;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      const abortErrorMsg = "La solicitud al asistente tardó demasiado en responder y fue cancelada.";
      console.error(`aiService: ERROR GENERAL en sendMessageToAI: ${abortErrorMsg} (Timeout)`);
      throw new Error(abortErrorMsg);
    }
    // No relanzar el SessionExpiredError para que el catch general no lo sobreescriba.
    if (error instanceof SessionExpiredError) {
        throw error;
    }
    console.error(`aiService: ERROR GENERAL en sendMessageToAI: ${error instanceof Error ? error.message : String(error)}`);
    throw error; // Propagar otros errores
  }
};

// La función getSessionHistory debe estar definida o importada. 
// Si no está, necesitamos agregarla o importarla desde zepService.ts
// async function getSessionHistory(sessionId: string, limit: number) {
//   // Implementación de ejemplo, reemplazar con la real de zepService
//   console.warn(`getSessionHistory NO IMPLEMENTADA EN ESTE ALCANCE - Usando mock para ${sessionId} con límite ${limit}`);
//   return [{role: 'user', content: 'Mensaje de prueba del historial de Zep'}];
// }

/**
 * Estimar aproximadamente el número de tokens en un texto
 * Una estimación sencilla: 1 token ≈ 4 caracteres en inglés, 3 en español
 */
// function estimateTokenCount(text: string): number { // Eliminado
//   return Math.ceil(text.length / 3);
// }
