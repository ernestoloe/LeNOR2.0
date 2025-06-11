import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types/chat';
import { logError } from './loggingService';
import { generateId } from '../utils/id';
import { getTimestampFromMessageId } from '../utils/id';

// Claves para almacenamiento
const STORAGE_KEYS = {
  MESSAGES_PREFIX: 'user:',
  MESSAGES_SUFFIX: ':messages',
  USER_PREFERENCES: 'user_preferences:',
  LAST_SYNC_TIME: 'last_sync_time:',
  CURRENT_CONVERSATION: ':current_conversation',
  CONVERSATION_PREFIX: ':conversation:',
  CONVERSATION_METADATA_SUFFIX: ':metadata',
};

// Número máximo de mensajes a recuperar por defecto
const DEFAULT_PAGE_SIZE = 10;

// Interfaz para metadatos de conversación
interface ConversationMetadata {
  timestamp: number;
  lastMessage?: string;
  messageCount: number;
}

/**
 * Carga los mensajes de una conversación desde el almacenamiento local
 * @param userId ID del usuario
 * @param conversationId ID de la conversación
 * @param limit Tamaño de la página (opcional)
 * @param offset Desplazamiento (opcional)
 * @returns Array de mensajes ordenados por timestamp
 */
export const loadMessagesFromStorage = async (
  userId: string,
  conversationId: string,
  limit = DEFAULT_PAGE_SIZE,
  offset = 0
): Promise<Message[]> => {
  try {
    if (!userId || !conversationId) {
      console.warn('loadMessagesFromStorage: userId o conversationId no proporcionados');
      return [];
    }

    const storageKey = `${STORAGE_KEYS.MESSAGES_PREFIX}${userId}${STORAGE_KEYS.CONVERSATION_PREFIX}${conversationId}${STORAGE_KEYS.MESSAGES_SUFFIX}`;
    const messagesJson = await AsyncStorage.getItem(storageKey);
    if (!messagesJson) {
      return [];
    }

    const messages: Message[] = JSON.parse(messagesJson);
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return [];
    }
    
    // Ordenar todos los mensajes por timestamp ascendente (más antiguo primero)
    const allSortedMessages = [...messages].sort((a, b) => {
      const timestampA = getTimestampFromMessageId(a.id) || 0;
      const timestampB = getTimestampFromMessageId(b.id) || 0;
      return timestampA - timestampB;
    });
    
    // Aplicar paginación para obtener la 'ventana' correcta de mensajes
    // Queremos los 'limit' mensajes desde el final del array, desplazados por 'offset'
    // Ejemplo: allSortedMessages.length = 100, limit = 20
    // offset = 0 (pág 0 más reciente): startIndex = 100 - 20 - 0 = 80. Slice [80, 100) -> mensajes 80 a 99
    // offset = 20 (pág 1 más antigua): startIndex = 100 - 20 - 20 = 60. Slice [60, 80) -> mensajes 60 a 79
    // offset = 80 (última pág antigua): startIndex = 100 - 20 - 80 = 0. Slice [0, 20) -> mensajes 0 a 19

    const calculatedStartIndex = allSortedMessages.length - limit - offset;
    const startIndex = Math.max(0, calculatedStartIndex);
    const endIndex = Math.max(0, allSortedMessages.length - offset);
    
    // Asegurarse de que startIndex no sea mayor que endIndex
    if (startIndex >= endIndex) {
        return []; // No hay mensajes en este rango o el offset es demasiado grande
    }
    
    return allSortedMessages.slice(startIndex, endIndex);

  } catch (error) {
    console.error('Error cargando mensajes del almacenamiento:', error);
    logError(error, 'loadMessagesFromStorage');
    return [];
  }
};

/**
 * Guarda un array de mensajes en el almacenamiento local
 * @param userId ID del usuario
 * @param conversationId ID de la conversación
 * @param newMessages Mensajes a guardar
 * @param append Si es true, añade los mensajes a los existentes; si es false, reemplaza todos los mensajes
 */
export const saveMessagesToStorage = async (
  userId: string,
  conversationId: string,
  newMessages: Message[],
  append = true
): Promise<void> => {
  try {
    if (!userId || !conversationId || !newMessages.length) {
      console.warn('saveMessagesToStorage: faltan parámetros requeridos');
      return;
    }

    // Construir la clave de almacenamiento
    const storageKey = `${STORAGE_KEYS.MESSAGES_PREFIX}${userId}${STORAGE_KEYS.CONVERSATION_PREFIX}${conversationId}${STORAGE_KEYS.MESSAGES_SUFFIX}`;
    
    let messagesToSave: Message[] = [...newMessages];
    
    if (append) {
      // Obtener mensajes existentes
      const existingMessagesJson = await AsyncStorage.getItem(storageKey);
      if (existingMessagesJson) {
        const existingMessages: Message[] = JSON.parse(existingMessagesJson);
        
        // Crear un Set de IDs existentes para verificar duplicados
        const existingIds = new Set(existingMessages.map(msg => msg.id));
        
        // Filtrar mensajes nuevos para eliminar duplicados
        const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));
        
        // Combinar mensajes existentes y nuevos
        messagesToSave = [...existingMessages, ...uniqueNewMessages];
      }
    }
    
    // Guardar mensajes en AsyncStorage
    await AsyncStorage.setItem(storageKey, JSON.stringify(messagesToSave));
    
    // Actualizar metadatos de la conversación
    await updateConversationMetadata(userId, conversationId, messagesToSave);
    
    console.log(`Guardados ${messagesToSave.length} mensajes para conversación ${conversationId}`);
  } catch (error) {
    console.error('Error guardando mensajes en almacenamiento:', error);
    logError(error, 'saveMessagesToStorage');
  }
};

/**
 * Guarda un único mensaje en el almacenamiento local
 * @param userId ID del usuario
 * @param conversationId ID de la conversación
 * @param message Mensaje a guardar
 */
export const saveMessageToStorage = async (
  userId: string,
  conversationId: string,
  message: Message
): Promise<void> => {
  await saveMessagesToStorage(userId, conversationId, [message], true);
};

/**
 * Establece la conversación actual para un usuario
 * @param userId ID del usuario
 * @param conversationId ID de la conversación
 */
export const setCurrentConversation = async (
  userId: string,
  conversationId: string
): Promise<void> => {
  try {
    if (!userId || !conversationId) {
      console.warn('setCurrentConversation: faltan parámetros requeridos');
      return;
    }
    
    const storageKey = `${STORAGE_KEYS.MESSAGES_PREFIX}${userId}${STORAGE_KEYS.CURRENT_CONVERSATION}`;
    await AsyncStorage.setItem(storageKey, conversationId);
    console.log(`Conversación actual establecida: ${conversationId}`);
  } catch (error) {
    console.error('Error estableciendo conversación actual:', error);
    logError(error, 'setCurrentConversation');
  }
};

/**
 * Obtiene el ID de la conversación actual de un usuario
 * @param userId ID del usuario
 * @returns ID de la conversación actual o null si no hay ninguna
 */
export const getCurrentConversation = async (userId: string): Promise<string | null> => {
  try {
    if (!userId) {
      console.warn('getCurrentConversation: userId no proporcionado');
      return null;
    }
    
    const storageKey = `${STORAGE_KEYS.MESSAGES_PREFIX}${userId}${STORAGE_KEYS.CURRENT_CONVERSATION}`;
    const conversationId = await AsyncStorage.getItem(storageKey);
    return conversationId;
  } catch (error) {
    console.error('Error obteniendo conversación actual:', error);
    logError(error, 'getCurrentConversation');
    return null;
  }
};

/**
 * Crea una nueva conversación y la establece como la actual
 * @param userId ID del usuario
 * @returns ID de la nueva conversación
 */
export const startNewConversation = async (userId: string): Promise<string> => {
  try {
    if (!userId) {
      const errorMsg = 'startNewConversation: userId no proporcionado y es requerido.';
      console.error(errorMsg);
      // Lanzar un error si userId está vacío para que las capas superiores lo manejen.
      throw new Error(errorMsg);
    }
    
    // Generar ID para la nueva conversación
    const conversationId = generateId();
    
    // Establecerla como conversación actual
    await setCurrentConversation(userId, conversationId);
    
    // Inicializar metadatos de la conversación
    const metadata: ConversationMetadata = {
      timestamp: Date.now(),
      messageCount: 0,
    };
    
    // Guardar metadatos
    const metadataKey = `${STORAGE_KEYS.MESSAGES_PREFIX}${userId}${STORAGE_KEYS.CONVERSATION_PREFIX}${conversationId}${STORAGE_KEYS.CONVERSATION_METADATA_SUFFIX}`;
    await AsyncStorage.setItem(metadataKey, JSON.stringify(metadata));
    
    // Guardar una clave "raíz" para la conversación para que pueda ser descubierta por ConversationsScreen
    const conversationRootKey = `${STORAGE_KEYS.MESSAGES_PREFIX}${userId}${STORAGE_KEYS.CONVERSATION_PREFIX}${conversationId}`;
    await AsyncStorage.setItem(conversationRootKey, JSON.stringify({ created: metadata.timestamp })); // Guardar algo simple como la fecha de creación
    
    console.log(`>>> storageService: Nueva conversación iniciada y guardada: ${conversationId} para usuario ${userId}`);
    return conversationId;
  } catch (error) {
    console.error('Error iniciando nueva conversación:', error);
    logError(error, 'startNewConversation');
    // Relanzar el error para que sea manejado por el llamador (AuthContext -> ConversationsScreen)
    throw error;
  }
};

/**
 * Elimina todos los datos almacenados de un usuario
 * @param userId ID del usuario
 */
export const clearUserStorage = async (userId: string): Promise<void> => {
  try {
    if (!userId) {
      console.warn('clearUserStorage: userId no proporcionado');
      return;
    }
    
    // Obtener todas las claves
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filtrar claves del usuario
    const userPrefix = `${STORAGE_KEYS.MESSAGES_PREFIX}${userId}`;
    const userKeys = allKeys.filter(key => key.startsWith(userPrefix));
    
    // Eliminar todas las claves del usuario
    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
      console.log(`Eliminados ${userKeys.length} elementos de almacenamiento para usuario ${userId}`);
    }
  } catch (error) {
    console.error('Error limpiando almacenamiento del usuario:', error);
    logError(error, 'clearUserStorage');
  }
};

/**
 * Guarda el timestamp de la última sincronización con el servidor
 * @param userId ID del usuario
 * @param timestamp Timestamp de la sincronización
 */
export const saveLastSyncTime = async (userId: string, timestamp: number): Promise<void> => {
  try {
    if (!userId) {
      console.warn('saveLastSyncTime: userId no proporcionado');
      return;
    }
    
    const storageKey = `${STORAGE_KEYS.LAST_SYNC_TIME}${userId}`;
    await AsyncStorage.setItem(storageKey, timestamp.toString());
  } catch (error) {
    console.error('Error guardando timestamp de sincronización:', error);
    logError(error, 'saveLastSyncTime');
  }
};

/**
 * Obtiene el timestamp de la última sincronización con el servidor
 * @param userId ID del usuario
 * @returns Timestamp de la última sincronización o 0 si no hay ninguna
 */
export const getLastSyncTime = async (userId: string): Promise<number> => {
  try {
    if (!userId) {
      console.warn('getLastSyncTime: userId no proporcionado');
      return 0;
    }
    
    const storageKey = `${STORAGE_KEYS.LAST_SYNC_TIME}${userId}`;
    const timestampStr = await AsyncStorage.getItem(storageKey);
    return timestampStr ? parseInt(timestampStr, 10) : 0;
  } catch (error) {
    console.error('Error obteniendo timestamp de sincronización:', error);
    logError(error, 'getLastSyncTime');
    return 0;
  }
};

/**
 * Actualiza los metadatos de una conversación
 * @param userId ID del usuario
 * @param conversationId ID de la conversación
 * @param messages Mensajes para extraer el último y el recuento
 */
export const updateConversationMetadata = async (
  userId: string,
  conversationId: string,
  messages?: Message[]
): Promise<void> => {
  try {
    if (!userId || !conversationId) {
      console.warn('updateConversationMetadata: faltan parámetros requeridos');
      return;
    }
    
    const metadataKey = `${STORAGE_KEYS.MESSAGES_PREFIX}${userId}${STORAGE_KEYS.CONVERSATION_PREFIX}${conversationId}${STORAGE_KEYS.CONVERSATION_METADATA_SUFFIX}`;
    
    // Extraer o recuperar mensajes
    let messagesToUse = messages;
    if (!messagesToUse || messagesToUse.length === 0) {
      messagesToUse = await loadMessagesFromStorage(userId, conversationId, 100); // Cargar más mensajes para tener una visión más completa
    }
    
    // Si aún no hay mensajes, crear metadatos iniciales
    if (!messagesToUse || messagesToUse.length === 0) {
      const initialMetadata: ConversationMetadata = {
        timestamp: Date.now(),
        messageCount: 0,
        lastMessage: 'Sin mensajes'
      };
      await AsyncStorage.setItem(metadataKey, JSON.stringify(initialMetadata));
      console.log(`Metadatos iniciales creados para conversación ${conversationId}`);
      return;
    }
    
    // Ordenar mensajes para encontrar el más reciente
    const sortedMessages = [...messagesToUse].sort((a, b) => {
      const timestampA = getTimestampFromMessageId(a.id) || 0;
      const timestampB = getTimestampFromMessageId(b.id) || 0;
      return timestampB - timestampA; // Orden descendente para encontrar el más reciente
    });
    
    // Obtener el último mensaje
    const lastMessage = sortedMessages[0];
    const lastTimestamp = getTimestampFromMessageId(lastMessage.id) || Date.now();
    
    // Leer metadatos existentes o crear nuevos
    const existingMetadataJson = await AsyncStorage.getItem(metadataKey);
    let metadata: ConversationMetadata;
    
    if (existingMetadataJson) {
      metadata = JSON.parse(existingMetadataJson);
      metadata.timestamp = lastTimestamp;
      metadata.lastMessage = lastMessage.text.substring(0, 100); // Limitar longitud
      metadata.messageCount = messagesToUse.length;
    } else {
      metadata = {
        timestamp: lastTimestamp,
        lastMessage: lastMessage.text.substring(0, 100),
        messageCount: messagesToUse.length
      };
    }
    
    // Guardar metadatos actualizados
    await AsyncStorage.setItem(metadataKey, JSON.stringify(metadata));
    console.log(`Metadatos actualizados para conversación ${conversationId}: ${metadata.messageCount} mensajes`);
  } catch (error) {
    console.error('Error actualizando metadatos de conversación:', error);
    logError(error, 'updateConversationMetadata');
  }
};

/**
 * Obtiene los metadatos de una conversación
 * @param userId ID del usuario
 * @param conversationId ID de la conversación
 * @returns Metadatos de la conversación o null si no existen
 */
export const getConversationMetadata = async (
  userId: string,
  conversationId: string
): Promise<ConversationMetadata | null> => {
  try {
    if (!userId || !conversationId) {
      console.warn('getConversationMetadata: faltan parámetros requeridos');
      return null;
    }
    
    // Clave para los metadatos
    const metadataKey = `${STORAGE_KEYS.MESSAGES_PREFIX}${userId}${STORAGE_KEYS.CONVERSATION_PREFIX}${conversationId}${STORAGE_KEYS.CONVERSATION_METADATA_SUFFIX}`;
    
    // Obtener metadatos
    const metadataJson = await AsyncStorage.getItem(metadataKey);
    
    if (!metadataJson) {
      return null;
    }
    
    return JSON.parse(metadataJson);
  } catch (error) {
    console.error('Error obteniendo metadatos de conversación:', error);
    logError(error, 'getConversationMetadata');
    return null;
  }
};

/**
 * Obtiene una lista de todas las conversaciones de un usuario
 * @param userId ID del usuario
 * @returns Lista de IDs de conversaciones
 */
export const getConversationList = async (userId: string): Promise<string[]> => {
  try {
    if (!userId) {
      console.warn('getConversationList: userId no proporcionado');
      return [];
    }
    
    // Obtener todas las claves
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Prefijo para las conversaciones
    const convPrefix = `${STORAGE_KEYS.MESSAGES_PREFIX}${userId}${STORAGE_KEYS.CONVERSATION_PREFIX}`;
    
    // Filtrar claves de metadatos de conversaciones
    const metadataSuffix = STORAGE_KEYS.CONVERSATION_METADATA_SUFFIX;
    const conversationMetadataKeys = allKeys.filter(key => 
      key.startsWith(convPrefix) && key.endsWith(metadataSuffix)
    );
    
    // Extraer IDs de conversación de las claves
    return conversationMetadataKeys.map(key => 
      key.substring(convPrefix.length, key.length - metadataSuffix.length)
    );
  } catch (error) {
    console.error('Error obteniendo lista de conversaciones:', error);
    logError(error, 'getConversationList');
    return [];
  }
}; 