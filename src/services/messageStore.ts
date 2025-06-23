import { Message } from '../types/chat';
import {
  loadMessagesFromStorage as loadFromStorage,
  saveMessagesToStorage as saveToStorage,
  getCurrentConversation as getCurrentConv,
  saveMessageToStorage,
} from './storageService';
import { generateMessageId } from '../utils/id';
import { supabase } from './supabaseClient';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const create = require('zustand/vanilla').default;
import { NetInfoState } from '@react-native-community/netinfo';

// Tipo para los eventos del store
type MessageStoreEvent = 'update' | 'error' | 'pagination';
type MessageStoreCallback = (messages: Message[]) => void;

interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  totalMessages: number;
}

/**
 * Almacén global de mensajes para garantizar consistencia entre componentes
 * con soporte para almacenamiento local, paginación, conversaciones separadas
 * y sincronización con Supabase (últimos 20 mensajes)
 */
class MessageStore {
  private messages: Message[] = [];
  private listeners: Record<MessageStoreEvent, MessageStoreCallback[]> = {
    update: [],
    error: [],
    pagination: []
  };
  private lastUpdateTime: number = 0;
  private currentUserId: string = '';
  private currentConversationId: string | null = null;
  private paginationInfo: PaginationInfo = {
    currentPage: 0,
    hasMore: false,
    totalMessages: 0,
    pageSize: 10
  };
  private pendingMessages: {message: Message, retryCount: number}[] = [];
  private isOnline: boolean = true;
  private isInitialized: boolean = false; // Flag de inicialización
  
  constructor() {
    console.log('>>> MessageStore: Creado (no inicializado)');
  }
  
  /**
   * Inicializa los servicios que dependen de módulos nativos.
   * Debe ser llamado desde un componente React (ej. App.tsx) una vez que la app está montada.
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.log('MessageStore: Ya inicializado');
      return;
    }
    
    try {
      console.log('MessageStore: Inicializando...');
    this.setupNetworkListener();
    this.isInitialized = true;
      console.log('MessageStore: Inicialización completada');
    } catch (error) {
      console.error('MessageStore: Error en inicialización:', error);
      this.isInitialized = false;
    }
  }
  
  /**
   * Configura el listener para monitorear el estado de conexión
   */
  private setupNetworkListener() {
    // Importación dinámica: Se carga el módulo solo cuando esta función es llamada.
    const NetInfo = require('@react-native-community/netinfo');

    NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = !!state.isConnected;
      
      // Si el estado de conectividad cambió
      if (this.isOnline !== isConnected) {
        this.isOnline = isConnected;
        console.log(`>>> MessageStore: Estado de conexión cambiado a: ${isConnected ? 'CONECTADO' : 'DESCONECTADO'}`);
        
        // Si acabamos de reconectarnos, intentar procesar los mensajes pendientes
        if (isConnected && this.pendingMessages.length > 0) {
          console.log(`>>> MessageStore: Intentando procesar ${this.pendingMessages.length} mensajes pendientes`);
          this.processPendingMessages();
        }
      }
    });
  }
  
  /**
   * Intenta procesar mensajes pendientes que no pudieron enviarse por falta de conexión
   */
  private async processPendingMessages() {
    // Procesar copias para evitar cambios durante la iteración
    const pendingCopy = [...this.pendingMessages];
    this.pendingMessages = [];
    
    for (const pendingItem of pendingCopy) {
      try {
      console.log(`>>> MessageStore: Procesando mensaje pendiente: ${pendingItem.message.id}`);
        await this.saveMessageToSupabase(pendingItem.message);
        console.log(`>>> MessageStore: Mensaje pendiente guardado en Supabase: ${pendingItem.message.id}`);
      } catch (error) {
        console.error(`>>> MessageStore: Error procesando mensaje pendiente ${pendingItem.message.id}:`, error);
        // Si falla, volver a agregar a pendientes con retry incrementado
        if (pendingItem.retryCount < 3) {
          this.pendingMessages.push({
            ...pendingItem,
            retryCount: pendingItem.retryCount + 1
          });
        }
      }
    }
  }

  /**
   * Guarda un mensaje en Supabase (con rotación automática por trigger)
   */
  private async saveMessageToSupabase(message: Message): Promise<void> {
    if (!this.currentUserId || !this.currentConversationId) {
      throw new Error('Usuario o conversación no establecidos');
    }

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        id: message.id,
        user_id: this.currentUserId,
        conversation_id: this.currentConversationId,
        content: message.text,
        is_user: message.isUser,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Error guardando mensaje en Supabase: ${error.message}`);
    }
  }

  /**
   * Carga mensajes desde Supabase (últimos 20 por conversación)
   */
  private async loadMessagesFromSupabase(): Promise<Message[]> {
    if (!this.currentUserId || !this.currentConversationId) {
      console.warn('>>> MessageStore: No hay usuario o conversación para cargar desde Supabase');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('conversation_id', this.currentConversationId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) {
        console.error('>>> MessageStore: Error cargando mensajes desde Supabase:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Convertir formato Supabase a formato Message
      const messages: Message[] = data.map(row => ({
        id: row.id,
        text: row.content,
        isUser: row.is_user,
        timestamp: new Date(row.created_at).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));

      console.log(`>>> MessageStore: ${messages.length} mensajes cargados desde Supabase`);
      return messages;
    } catch (error) {
      console.error('>>> MessageStore: Error en loadMessagesFromSupabase:', error);
      return [];
    }
  }
  
  /**
   * Establece el usuario actual para manejar sus mensajes
   */
  setCurrentUser(userId: string): void {
    if (userId !== this.currentUserId) {
      this.currentUserId = userId;
      console.log(`>>> MessageStore: Usuario actual cambiado a: ${userId}`);
      this.loadMessagesFromStorage();
    }
  }
  
  /**
   * Carga los mensajes desde el almacenamiento (AsyncStorage + Supabase)
   */
  async loadMessagesFromStorage(pageToLoad: number = 0): Promise<void> {
    if (!this.currentUserId) {
      console.warn('>>> MessageStore: No hay usuario actual establecido para cargar mensajes.');
      return;
    }

    try {
      if (!this.currentConversationId) {
        this.currentConversationId = await getCurrentConv(this.currentUserId);
        if (!this.currentConversationId) {
          console.warn('>>> MessageStore: No hay conversación actual para cargar mensajes.');
          this.messages = [];
          this.paginationInfo = { ...this.paginationInfo, currentPage: 0, hasMore: false };
          this.notifyListeners('update');
          this.notifyListeners('pagination');
          return;
        }
      }

      // Para la primera carga (página 0), intentar cargar desde Supabase primero
      if (pageToLoad === 0 && this.isOnline) {
        try {
          const supabaseMessages = await this.loadMessagesFromSupabase();
          if (supabaseMessages.length > 0) {
            console.log(`>>> MessageStore: Usando ${supabaseMessages.length} mensajes desde Supabase`);
            this.messages = supabaseMessages;
            this.paginationInfo = {
              ...this.paginationInfo,
              currentPage: 0,
              hasMore: false, // Supabase solo tiene los últimos 20
            };
            this.lastUpdateTime = Date.now();
            this.notifyListeners('update');
            this.notifyListeners('pagination');
            return;
          }
        } catch (error) {
          console.warn('>>> MessageStore: Error cargando desde Supabase, usando AsyncStorage:', error);
        }
      }

      // Fallback a AsyncStorage (para historial más antiguo o cuando Supabase falla)
      const limit = this.paginationInfo.pageSize;
      const offset = pageToLoad * limit;

      console.log(`>>> MessageStore: Cargando mensajes desde AsyncStorage. Page: ${pageToLoad}, Limit: ${limit}, Offset: ${offset}`);

      const loadedMessages = await loadFromStorage(
        this.currentUserId,
        this.currentConversationId,
        limit,
        offset
      );

      console.log(`>>> MessageStore: ${loadedMessages.length} mensajes cargados desde AsyncStorage.`);

      if (pageToLoad === 0) {
        this.messages = loadedMessages; // Carga inicial, reemplaza los mensajes
      } else {
        // Carga de historial más antiguo, añadir al PRINCIPIO
        this.messages = [...loadedMessages, ...this.messages];
      }

      this.paginationInfo = {
        ...this.paginationInfo,
        currentPage: pageToLoad,
        hasMore: loadedMessages.length === limit && loadedMessages.length > 0,
      };

      this.lastUpdateTime = Date.now();
      console.log(`>>> MessageStore: Mensajes actualizados. Total: ${this.messages.length}. HasMore: ${this.paginationInfo.hasMore}`);
      this.notifyListeners('update');
      this.notifyListeners('pagination');
    } catch (error: unknown) {
      console.error('Error en MessageStore_loadMessagesFromStorage:', error instanceof Error ? error : new Error(String(error)));
      this.notifyListeners('error');
    }
  }
  
  /**
   * Establece la conversación actual
   */
  async setCurrentConversation(conversationId: string | null): Promise<void> {
    if (this.currentConversationId !== conversationId) {
      this.currentConversationId = conversationId;
      console.log(`>>> MessageStore: Conversación actual cambiada a: ${conversationId}`);
      
      // Reiniciar paginación
      this.paginationInfo.currentPage = 0;
      
      // Cargar mensajes de la nueva conversación
      await this.loadMessagesFromStorage();
    }
  }
  
  /**
   * Carga la página siguiente de mensajes
   */
  async loadNextPage(): Promise<boolean> {
    if (!this.paginationInfo.hasMore) {
      console.log('>>> MessageStore: No hay más mensajes para cargar (loadNextPage).');
      return false;
    }
    const nextPageToLoad = this.paginationInfo.currentPage + 1;
    console.log(`>>> MessageStore: Intentando cargar siguiente página: ${nextPageToLoad}`);
    await this.loadMessagesFromStorage(nextPageToLoad);
    return true;
  }
  
  // Obtener todos los mensajes
  getMessages(): Message[] {
    // Verificar que realmente hay mensajes
    if (!Array.isArray(this.messages)) {
      console.error('>>> MessageStore: El estado interno no es un array');
      return [];
    }
    
    // Devolver copia INVERTIDA para FlatList inverted={true}
    const messagesCopy = [...this.messages].reverse();
    console.log(`>>> MessageStore.getMessages: Devolviendo ${messagesCopy.length} mensajes (ordenados para display)`);
    return messagesCopy;
  }
  
  /**
   * Obtiene información sobre la paginación actual
   */
  getPaginationInfo(): PaginationInfo {
    return { ...this.paginationInfo };
  }
  
  // Agregar un mensaje y notificar a los oyentes
  addMessage(message: Message): void {
    try {
      if (!message || !message.text) {
        throw new Error('Intento de agregar mensaje inválido');
      }
      
      // Asegurar que el mensaje tenga un ID válido
      if (!message.id) {
        message.id = generateMessageId(this.currentUserId);
      }
      
      // Asegurar que siempre trabajamos con un array válido
      if (!Array.isArray(this.messages)) {
        console.warn('>>> MessageStore: Reiniciando estado interno porque no es un array');
        this.messages = [];
      }
      
      // Agregar con método inmutable para evitar problemas de mutación
      this.messages = [...this.messages, message];
      
      this.lastUpdateTime = Date.now();
      
      // Guardar en AsyncStorage
      this.saveMessageToStorage(message);

      // Guardar en Supabase (con rotación automática por trigger)
      if (this.isOnline) {
        this.saveMessageToSupabase(message).catch(error => {
          console.error('Error guardando mensaje en Supabase:', error);
      
          // Si falla, agregar a pendientes para reintento
          const existingPending = this.pendingMessages.find(p => p.message.id === message.id);
          if (!existingPending) {
            this.pendingMessages.push({ message, retryCount: 0 });
            console.log(`>>> MessageStore: Mensaje ${message.id} agregado a pendientes para Supabase`);
          }
        });
      } else {
        // Si estamos offline, agregar directamente a pendientes
        const existingPending = this.pendingMessages.find(p => p.message.id === message.id);
        if (!existingPending) {
          this.pendingMessages.push({ message, retryCount: 0 });
          console.log(`>>> MessageStore: Mensaje ${message.id} agregado a pendientes (offline)`);
        }
      }
      
      this.notifyListeners('update');
      
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('Error en MessageStore_addMessage:', error.message);
      this.notifyListeners('error');
    }
  }
  
  /**
   * Guarda un mensaje en el almacenamiento local
   */
  private async saveMessageToStorage(message: Message): Promise<void> {
    if (!this.currentUserId || !this.currentConversationId) {
      console.warn("No se puede guardar el mensaje: falta userId o conversationId.");
      return;
    }
    try {
      await saveToStorage(this.currentUserId, this.currentConversationId, [message], true);
    } catch (error) {
      console.error('Error guardando mensaje individual en storage:', error);
    }
  }
  
  // Establecer mensajes (por ejemplo, al cargar historial)
  setMessages(messages: Message[]): void {
    try {
      if (!Array.isArray(messages)) {
        throw new Error(`setMessages recibió tipo inválido: ${typeof messages}`);
      }
      
      // Filtrar mensajes inválidos
      const validMessages = messages.filter(m => m && m.text && m.id);
      if (validMessages.length !== messages.length) {
        console.warn(`>>> MessageStore: Se filtraron ${messages.length - validMessages.length} mensajes inválidos`);
      }
      
      // Crear copia para asegurar inmutabilidad
      this.messages = [...validMessages];
      
      this.lastUpdateTime = Date.now();
      console.log(`>>> MessageStore: Mensajes establecidos. Total: ${this.messages.length}`);
      
      // Guardar en almacenamiento local si hay un usuario establecido
      if (this.currentUserId) {
        this.saveAllMessagesToStorage();
      }
      
      this.notifyListeners('update');
    } catch (error) {
      console.error('Error al establecer mensajes:', error);
      this.notifyListeners('error');
    }
  }
  
  /**
   * Guarda todos los mensajes en el almacenamiento local
   */
  private async saveAllMessagesToStorage(): Promise<void> {
    if (!this.currentUserId || !this.currentConversationId) {
      console.warn("No se pueden guardar todos los mensajes: falta userId o conversationId.");
      return;
    }
    try {
      await saveToStorage(this.currentUserId, this.currentConversationId, this.messages, false); // append = false
    } catch(error) {
      console.error('Error guardando todos los mensajes en storage:', error);
    }
  }
  
  // Suscribirse a eventos del store
  subscribe(event: MessageStoreEvent, callback: MessageStoreCallback): () => void {
    if (!this.listeners[event]) {
      console.warn(`>>> MessageStore: Intento de suscribirse a evento desconocido: ${event}`);
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(callback);
    console.log(`>>> MessageStore: Nuevo suscriptor para ${event}. Total: ${this.listeners[event].length}`);
    
    // Devolver función para cancelar suscripción
    return () => {
      console.log(`>>> MessageStore: Eliminando suscriptor de ${event}`);
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }
  
  // Notificar a los oyentes de un evento
  private notifyListeners(event: MessageStoreEvent): void {
    const messagesCopy = this.getMessages(); // Usar getMessages para garantizar copia limpia
    
    console.log(`>>> MessageStore: Notificando ${this.listeners[event].length} listeners para evento ${event}`);
    this.listeners[event].forEach(callback => {
      try {
        callback(messagesCopy);
      } catch (error) {
        console.error(`>>> MessageStore: Error en listener de ${event}:`, error);
      }
    });
  }
  
  // Borrar todos los mensajes
  clearMessages(): void {
    this.messages = [];
    this.lastUpdateTime = Date.now();
    console.log('>>> MessageStore: Todos los mensajes borrados');
    this.notifyListeners('update');
  }
  
  // Información de diagnóstico
  getDebugInfo(): object {
    return {
      messageCount: this.messages.length,
      listenerCounts: {
        update: this.listeners.update.length,
        error: this.listeners.error.length,
        pagination: this.listeners.pagination.length
      },
      currentUserId: this.currentUserId,
      currentConversationId: this.currentConversationId,
      paginationInfo: this.paginationInfo,
      pendingMessagesCount: this.pendingMessages.length,
      isOnline: this.isOnline,
      lastUpdateTime: new Date(this.lastUpdateTime).toISOString(),
      messagesValid: Array.isArray(this.messages)
    };
  }
  
  /**
   * Actualiza el último mensaje del asistente con nuevo texto durante el streaming
   */
  updateTypingMessage(token: string): void {
    if (!this.messages || this.messages.length === 0) {
      console.warn('>>> MessageStore: No hay mensajes para actualizar');
      return;
    }
    
    // Buscar el último mensaje del asistente (no del usuario)
    let lastAssistantMessageIndex = -1;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (!this.messages[i].isUser) {
        lastAssistantMessageIndex = i;
        break;
      }
    }
    
    if (lastAssistantMessageIndex === -1) {
      // Si no hay mensaje del asistente, crear uno nuevo
      const newMessage: Message = {
        id: generateMessageId('ai-streaming'),
        text: token,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        animateTyping: true
      };
      this.messages.push(newMessage);
    } else {
      // Actualizar el último mensaje del asistente
      this.messages[lastAssistantMessageIndex].text += token;
    }
    
    // Notificar a los oyentes
    this.notifyListeners('update');
  }

  public markAsAnimated(messageId: string): void {
    const messageIndex = this.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
      const updatedMessage = {
        ...this.messages[messageIndex],
        animateTyping: false,
        hasBeenAnimated: true,
      };
      this.messages = [
        ...this.messages.slice(0, messageIndex),
        updatedMessage,
        ...this.messages.slice(messageIndex + 1),
      ];
      // No es necesario guardar en storage solo por esto, a menos que se quiera persistir este estado.
      // Por ahora, solo actualizamos el estado en memoria y notificamos.
      this.notifyListeners('update');
      console.log(`>>> MessageStore: Message ${messageId} marked as animated.`);
    } else {
      console.warn(`>>> MessageStore: markAsAnimated - Message with ID ${messageId} not found.`);
    }
  }

  /**
   * INICIO: Métodos para manejar respuestas de IA en streaming
   */

  /**
   * Crea un nuevo mensaje de IA vacío para prepararse para el stream.
   * @param id El ID único para el mensaje que se va a streamear.
   */
  public startStreamMessage(id: string): void {
    if (this.messages.some(msg => msg.id === id)) {
      // Si el mensaje ya existe, no hacer nada.
      return;
    }
    const newMessage: Message = {
      id: id,
      text: '', // El texto comienza vacío
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      animateTyping: true, // La animación está activa durante el stream
      hasBeenAnimated: false,
    };
    this.messages = [...this.messages, newMessage];
    this.notifyListeners('update');
  }

  /**
   * Añade un trozo de texto (token) a un mensaje existente.
   * @param id El ID del mensaje que se está streameando.
   * @param token El trozo de texto para añadir.
   */
  public appendStreamToken(id: string, token: string): void {
    const messageIndex = this.messages.findIndex(msg => msg.id === id);
    if (messageIndex !== -1) {
      this.messages[messageIndex].text += token;
      this.notifyListeners('update');
    }
  }

  /**
   * Marca un mensaje como completamente streameado.
   * @param id El ID del mensaje que ha terminado de streamear.
   */
  public finalizeStream(id: string): void {
    const messageIndex = this.messages.findIndex(msg => msg.id === id);
    if (messageIndex !== -1) {
      this.messages[messageIndex].animateTyping = false; // Detener la animación de "escribiendo"
      this.messages[messageIndex].hasBeenAnimated = true; // Marcar como completamente animado
      
      // --- CORRECCIÓN: Guardar solo el mensaje finalizado, no todo. ---
      const finalMessage = this.messages[messageIndex];
      this.saveMessageToStorage(finalMessage);
      // --- FIN DE LA CORRECCIÓN ---

      this.notifyListeners('update');
      console.log(`>>> MessageStore: Stream finalizado para el mensaje ${id}.`);
    }
  }
  
  /**
   * FIN: Métodos para manejar respuestas de IA en streaming
   */
}

// --- INICIO: Implementación del Patrón Singleton ---
let instance: MessageStore | null = null;

function getMessageStoreInstance(): MessageStore {
  if (!instance) {
    instance = new MessageStore();
  }
  return instance;
}

// Exportar la instancia a través de la función en lugar de directamente
export const messageStore = getMessageStoreInstance();
// --- FIN: Implementación del Patrón Singleton ---

// Hook para usar el messageStore (si es que existe, si no, se puede borrar)
// export const useMessageStore = () => {
// ...
// }; 