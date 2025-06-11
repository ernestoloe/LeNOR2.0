import { ZepClient } from "@getzep/zep-js";
// Importar tipos, usando un alias interno para Message
// Importar también Message para usarlo como input type
import type { Session, Message as ZepMessageInternal, Memory, Message, Summary } from "@getzep/zep-js/api";
import { logError } from './loggingService';

// Exportar tipos necesarios, usando el alias para Message consistentemente
// También exportar ZepMessageInput que define la estructura para añadir mensajes
export type { Session, ZepMessageInternal as ZepMessage, Memory, Message as ZepMessageInput, Summary };

// Definir un tipo para GetMemoryResponse ya que no está exportado por la biblioteca
export interface GetMemoryResponse {
  context: string | null;
  messages: ZepMessageInternal[];
  summary: Summary | null;
  facts: unknown[];
  metadata: Record<string, unknown>;
}

const ZEP_API_KEY = process.env.EXPO_PUBLIC_ZEP;
const ZEP_API_URL = process.env.EXPO_PUBLIC_ZEP_API_URL; // Mantener por si se necesita override

if (!ZEP_API_KEY) {
  console.warn(">>> ZepService: ZEP_API_KEY no está definida.");
}

// Inicializar el cliente según la documentación oficial
export const zepClient = new ZepClient({
  apiKey: ZEP_API_KEY ?? '',
  baseUrl: 'https://api.getzep.com', // URL base de la API de Zep
});

/**
 * Añade un mensaje a una sesión en Zep
 */
export const addMessageToSession = async (
  sessionId: string,
  message: {
    message_id: string;
    role: string;
    content: string;
  }
): Promise<void> => {
  try {
    // Asegurar que el cliente Zep está inicializado
    if (!zepClient) {
      throw new Error(">>> ZepService: ZepClient no inicializado.");
    }
    
    // Asegurar que el sessionId es válido
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      throw new Error(`addMessageToSession: sessionId inválido: ${sessionId}`);
    }
    
    console.log(`Añadiendo mensaje a sesión Zep ${sessionId.substring(0, 8)} via SDK...`);
    
    // Mapear el rol al esperado por el SDK (user/ai/system/tool)
    let sdkRole: 'user' | 'ai' | 'system' | 'tool';
    if (message.role.toLowerCase() === 'usuario' || message.role.toLowerCase() === 'user') {
      sdkRole = 'user';
    } else if (message.role.toLowerCase() === 'lénor' || message.role.toLowerCase() === 'assistant' || message.role.toLowerCase() === 'ai') {
      sdkRole = 'ai';
    } else {
      console.warn(`Rol no reconocido para Zep SDK: ${message.role}. Usando 'ai'.`);
      sdkRole = 'ai'; // O manejar como error
    }

    // Crear el objeto de mensaje para el SDK, incluyendo el message_id.
    // Se usa un tipo de intersección para añadir la propiedad que falta en la definición del SDK.
    const sdkMessage: Message & { message_id: string } = {
      role: sdkRole,
      content: message.content,
      message_id: message.message_id,
    };
    
    const memoryPayload = { messages: [sdkMessage] };
    
    // Llamar al método add del SDK
    await zepClient.memory.add(sessionId, memoryPayload);
    
    console.log('Mensaje añadido a Zep correctamente via SDK');
  } catch (error) {
    console.error('Error en addMessageToSession (SDK):', error);
    logError(error, 'addMessageToSession_SDK');
    throw error; // Propagar el error para que sea manejado por el llamador
  }
};

/**
 * Obtiene la memoria para una sesión de Zep
 */
export const getSessionMemory = async (sessionId: string): Promise<{
  memories: Array<{
    message_id: string;
    role: string;
    content: string;
    created_at: string;
  }>;
} | null> => {
  try {
    if (!ZEP_API_KEY || !ZEP_API_URL) {
      console.warn('ZEP_API_KEY o ZEP_API_URL no definidos');
      return null;
    }
    
    // Asegurar que el sessionId es válido
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      console.error('getSessionMemory: sessionId inválido:', sessionId);
      return null;
    }
    
    console.log(`Recuperando memoria de sesión Zep ${sessionId.substring(0, 8)}...`);
    
    const response = await fetch(`${ZEP_API_URL}/api/v1/sessions/${sessionId}/memory`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZEP_API_KEY}`
      }
    });
    
    if (!response.ok) {
      // Si el error es 404, es posible que la sesión no exista y deba crearse
      if (response.status === 404) {
        console.log(`Sesión ${sessionId.substring(0, 8)} no encontrada en Zep. Creando nueva sesión...`);
        const created = await createSession(sessionId);
        if (created) {
          console.log('Nueva sesión creada en Zep');
          return { memories: [] }; // Devolver lista vacía para nueva sesión
        }
      }
      
      const errorText = await response.text();
      console.error(`Error al recuperar memoria de Zep: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    
    // Mapear la estructura de datos de Zep a nuestro formato
    const memories = data.messages.map((msg: { message_id?: string, role_type?: string, content?: string, created_at?: string }) => ({
      message_id: msg.message_id || '',
      role: msg.role_type === 'ai' ? 'assistant' : 'user',
      content: msg.content || '',
      created_at: msg.created_at || new Date().toISOString()
    }));
    
    console.log(`Recuperados ${memories.length} mensajes de Zep`);
    return { memories };
  } catch (error) {
    console.error('Error en getSessionMemory:', error);
    logError(error, 'getSessionMemory');
    return null;
  }
};

/**
 * Crea una nueva sesión en Zep
 */
const createSession = async (sessionId: string): Promise<boolean> => {
  try {
    if (!ZEP_API_KEY || !ZEP_API_URL) {
      console.warn('ZEP_API_KEY o ZEP_API_URL no definidos');
      return false;
    }
    
    console.log(`Creando nueva sesión en Zep: ${sessionId.substring(0, 8)}`);
    
    const response = await fetch(`${ZEP_API_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZEP_API_KEY}`
      },
      body: JSON.stringify({
        session_id: sessionId,
        metadata: {
          app: 'LÉNOR',
          creation_time: new Date().toISOString()
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error al crear sesión en Zep: ${response.status} - ${errorText}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error en createSession:', error);
    logError(error, 'createSession');
    return false;
  }
};

/**
 * Obtiene la memoria de Zep para una sesión, incluyendo el contexto sintetizado y mensajes recientes.
 */
export const getZepMemory = async (
  sessionId: string,
): Promise<GetMemoryResponse | null> => {
  if (!zepClient) {
    console.error(">>> ZepService: ZepClient no inicializado.");
    return null;
  }
  try {
    console.log(`>>> ZepService: Obteniendo memoria para sesión ${sessionId}`);
    // Usar el método get() como en la documentación
    const memory = await zepClient.memory.get(sessionId);
    
    // Convertir la respuesta al formato esperado
    const response: GetMemoryResponse = {
      context: null,
      messages: memory.messages || [],
      summary: null,
      facts: [],
      metadata: {}
    };
    
    console.log(`>>> ZepService: Memoria obtenida para ${sessionId}. Mensajes: ${response.messages.length}, Resumen disponible: ${!!response.summary?.content}, Hechos disponibles: ${response.facts?.length > 0}`);
    return response;
  } catch (error: unknown) {
    console.error(`>>> ZepService: Error obteniendo memoria de sesión ${sessionId}:`, error);
    // Verificar si error tiene una propiedad response (común en errores de axios o fetch)
    const apiError = error as { response?: { status?: number; data?: unknown } };
    if (apiError.response) {
      console.error(">>> ZepService: API Error Response:", apiError.response.data);
    }
    // Un 404 aquí puede ser normal si la sesión es nueva y no tiene memoria aún
    if (apiError.response && apiError.response.status === 404) {
      console.log(`>>> ZepService: No se encontró memoria para la sesión ${sessionId}.`);
      // Devolver un objeto vacío o null para indicar que no hay memoria aún
      return { context: null, messages: [], summary: null, facts: [], metadata: {} };
    }
    return null;
  }
};

// Ya no necesitamos getOrCreateZepSession explícito si add lo maneja implícitamente
// Tampoco necesitamos getZepSessionMemory si getZepMemory devuelve todo lo necesario 