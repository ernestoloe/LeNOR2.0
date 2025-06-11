// src/contexts/AuthContext.tsx

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { generateMessageId } from '../utils/id';
import {
  User,
  UserPreferences,
  getCurrentUser,
  getUserPreferencesAndNotes,
  signIn,
  signOut,
  signUp,
  updateUserPreferences,
  addExplicitMemoryNote,
  deleteExplicitMemoryNote,
  uploadImage,
  supabase,
} from '../services/supabase';
import { 
    loadMessages, 
    ChatMsg
} from '../hooks/useMessageMemory';
import { addMessageToSession } from '../services/zepService';
import { Message } from '../types/chat';
import { logError } from '../services/loggingService';
import { messageStore } from '../services/messageStore';
import { 
  startNewConversation, 
  getCurrentConversation, 
} from '../services/storageService';
import { sendMessageToAI, AIMessage, SessionExpiredError } from '../services/aiService';

// Constantes necesarias
const AI_ID = 'ai-lenor';
const DEFAULT_USER_PREFERENCES: UserPreferences = {
  empathetic: true,
  confrontational: false,
  detailed: true,
  concise: false,
  creative: true,
  logical: true
};

interface AuthContextType {
  user: User | null;
  userPreferences: UserPreferences | null;
  explicitMemoryNotes: string | null;
  messages: Message[];
  user_id: string;
  zepSessionId: string | null;
  currentConversationId: string | null;
  isLoading: boolean;
  isUserLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePreferences: (preferences: UserPreferences) => Promise<void>;
  addMemoryNote: (note: string) => Promise<void>;
  deleteMemoryNote: (noteToDelete: string) => Promise<void>;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>;
  startNewChat: () => Promise<void>;
  loadMoreMessages: () => Promise<boolean>;
  sendMessage: (messageText: string, localImageUri?: string | null) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [explicitMemoryNotes, setExplicitMemoryNotes] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [zepSessionId, setZepSessionId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUserLoading, setIsUserLoading] = useState<boolean>(false);

  useEffect(() => {
      setIsLoading(true);
    // Listener para cambios de estado de autenticación de Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        console.log(
          '>>> AuthContext: onAuthStateChange event:',
          _event,
          'session:',
          session ? 'exists' : 'null'
        );
        setIsUserLoading(true);
        try {
          if (session && session.user) {
            const currentUserData: User = {
              id: session.user.id,
              email: session.user.email || ''
            };
            setUser(currentUserData);
            setUserId(session.user.id);
            messageStore.setCurrentUser(session.user.id);

            const prefsAndNotes = await getUserPreferencesAndNotes(session.user.id);
          if (prefsAndNotes) {
              const { preferences, explicit_memory_notes, zep_session_id } = prefsAndNotes;
              setUserPreferences(preferences);
            setExplicitMemoryNotes(explicit_memory_notes || '');
              setZepSessionId(zep_session_id || session.user.id); 
          } else {
              const defaultPrefsForContext: UserPreferences = {
                  empathetic: false, confrontational: false, detailed: false, concise: false,
                  creative: false, logical: false, nicknameForLenor: '', workScheduleNotes: '',
                  hobbiesNotes: '', relationshipsNotes: ''
              };
              setUserPreferences(defaultPrefsForContext);
            setExplicitMemoryNotes('');
              setZepSessionId(session.user.id);
              console.warn(`>>> AuthContext (onAuthStateChange): getUserPreferencesAndNotes devolvió null. Usando defaults.`);
          }

            let convId = await getCurrentConversation(session.user.id);
          if (!convId) {
              console.log(">>> AuthContext (onAuthStateChange): No se encontró conversación actual, iniciando una nueva.");
              convId = await startNewConversation(session.user.id);
          }
          setCurrentConversationId(convId);
          messageStore.setCurrentConversation(convId);
        } else {
            setUser(null);
            setUserId('');
            setUserPreferences(null);
            setExplicitMemoryNotes(null);
            setZepSessionId(null);
            setCurrentConversationId(null);
            messageStore.clearMessages();
            messageStore.setCurrentUser('');
          }
        } catch (error) {
          console.error('>>> AuthContext: Error en onAuthStateChange manejando sesión:', error);
          setUser(null);
          setUserId('');
          setUserPreferences(null);
          setExplicitMemoryNotes(null);
          setZepSessionId(null);
          setCurrentConversationId(null);
          messageStore.clearMessages();
          messageStore.setCurrentUser('');
        } finally {
          setIsUserLoading(false);
          setIsLoading(false);
        }
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        console.log('>>> AuthContext: Limpiando authListener de Supabase');
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    console.log('>>> AuthContext: Configurando suscripción a messageStore');
    const unsubscribe = messageStore.subscribe('update', (updatedMessages) => {
      setMessages((prevMessages: Message[]) => {
        if (!messagesAreEqual(prevMessages, updatedMessages)) {
          console.log(
            `>>> AuthContext: Actualizando mensajes desde MessageStore. Count: ${updatedMessages.length}`
          );
          return updatedMessages; // Devuelve el nuevo estado
        }
        return prevMessages; // Devuelve el estado anterior si no hay cambios
      });
    });
    
    return () => {
      console.log('>>> AuthContext: Limpiando suscripción a messageStore');
      unsubscribe();
    };
  }, []); // Array de dependencias vacío para que se ejecute solo al montar/desmontar

  // Función auxiliar para comparar arrays de mensajes
  const messagesAreEqual = (a: Message[], b: Message[]): boolean => {
    if (a.length !== b.length) return false;
    // Solo comparar si ambos son arrays y tienen la misma longitud
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    
    // Comparación rápida de IDs (asumiendo que los IDs son únicos)
    const aIds = new Set(a.map(msg => msg.id));
    return b.every(msg => aIds.has(msg.id));
  };

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    setUser(null); // Limpiar usuario actual
    // Limpiar otros estados dependientes del usuario al inicio
    setMessages([]);
    messageStore.clearMessages();
    setZepSessionId(null);
    setUserPreferences(null);
    setExplicitMemoryNotes(null);
    setCurrentConversationId(null); // Limpiar también el ID de conversación
    setUserId(''); // Limpiar userId

    try {
      await signIn(email, password); // Intentar iniciar sesión
      const currentUser = await getCurrentUser(); // Obtener el usuario después del intento

      if (currentUser) {
        setUser(currentUser); // Establecer el usuario en el estado
        const currentUserId = currentUser.id;
        setUserId(currentUserId); // Establecer el userId

        messageStore.setCurrentUser(currentUserId);

        const prefsAndNotesFromSupabase = await getUserPreferencesAndNotes(currentUserId);
        if (prefsAndNotesFromSupabase) {
          const { preferences, explicit_memory_notes, zep_session_id } = prefsAndNotesFromSupabase;
          setUserPreferences(preferences);
          setExplicitMemoryNotes(explicit_memory_notes || '');
          setZepSessionId(zep_session_id || currentUserId);
          console.log(`>>> AuthContext (SignIn): Zep Session ID set to: ${zep_session_id || currentUserId}`);
        } else {
          // Si getUserPreferencesAndNotes devuelve null (por error, o si la inicialización falló críticamente)
          // Establecer un estado por defecto para UserPreferences
          const defaultPrefs: UserPreferences = {
            empathetic: false, confrontational: false, detailed: false, concise: false,
            creative: false, logical: false, nicknameForLenor: '', workScheduleNotes: '',
            hobbiesNotes: '', relationshipsNotes: ''
          };
          setUserPreferences(defaultPrefs);
          setExplicitMemoryNotes('');
          setZepSessionId(currentUserId); 
          console.warn(`>>> AuthContext (SignIn): getUserPreferencesAndNotes devolvió null. Usando defaults.`);
        }

        const convId = await getCurrentConversation(currentUserId);
        if (convId) {
          setCurrentConversationId(convId);
          messageStore.setCurrentConversation(convId);
        } else {
          // Si no hay conversación activa, crear una nueva
          const newConvId = await startNewConversation(currentUserId);
          setCurrentConversationId(newConvId);
          messageStore.setCurrentConversation(newConvId);
        }

        await messageStore.loadMessagesFromStorage();

        // Cargar mensajes desde Supabase como respaldo (lógica existente)
        try {
          const history = await loadMessages(currentUserId, 50);
          if (history.length > 0 && messageStore.getMessages().length === 0) {
            console.log(`>>> AuthContext (SignIn): Cargando ${history.length} mensajes adicionales desde Supabase.`);
            const formattedHistory: Message[] = history.map((msg: ChatMsg) => {
              // ChatMsg solo tiene 'role' y 'content'. 
              // ID y Timestamp deben generarse o tomarse del momento actual.
              const messageId = generateMessageId(currentUserId);
              const messageTimestamp = new Date().toISOString();

              return {
                id: messageId,
                text: msg.content,
                isUser: msg.role === 'user',
                timestamp: new Date(messageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'No time', 
              };
            });
            
            // Solo establecer si no hay mensajes ya cargados desde el storage local
            if (messageStore.getMessages().length === 0) {
              messageStore.setMessages(formattedHistory);
            }
          }
        } catch (supabaseError) {
          console.error('Error cargando mensajes desde Supabase durante sign-in:', supabaseError);
        }
        // Si todo fue exitoso, isLoading se manejará en el bloque finally.

      } else {
        // Caso: signIn pudo haber "exitoso" (sin lanzar error), pero el usuario no está disponible.
        // Esto es una condición de error.
        // Los estados ya fueron limpiados/restablecidos al inicio de la función.
        throw new Error("Inicio de sesión fallido: no se pudo verificar la información del usuario.");
      }
    } catch (error) {
      console.error('Error detallado al iniciar sesión (AuthContext):', error);
      // Asegurar que todos los estados específicos del usuario estén limpios.
      // La mayoría ya se limpiaron al inicio, pero reconfirmamos por si acaso.
      setUser(null);
      setUserId('');
      setMessages([]);
      messageStore.clearMessages();
      setZepSessionId(null);
      setUserPreferences(null);
      setExplicitMemoryNotes(null);
      setCurrentConversationId(null);
      // Re-lanzamos el error para que la capa de UI pueda manejarlo (e.g., mostrar un mensaje al usuario)
      throw error;
    } finally {
      setIsLoading(false); // Asegurar que isLoading se establezca en false
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    setIsLoading(true);
    setMessages([]);
    messageStore.clearMessages();
    setZepSessionId(null);
    try {
      await signUp(email, password);
      await handleSignIn(email, password);
    } catch (error) {
      console.error('Error al registrar o iniciar sesión post-registro:', error);
      setMessages([]);
      messageStore.clearMessages();
      setZepSessionId(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      setUser(null);
      setUserPreferences(null);
      setExplicitMemoryNotes(null);
      setUserId('');
      setMessages([]);
      setCurrentConversationId(null);
      messageStore.clearMessages();
      setZepSessionId(null);
    } catch (error) {
      console.error('Error al intentar salir de la sesión', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePreferences = async (newPrefs: UserPreferences) => {
    if (!userId) {
      console.error("User ID not available for updating preferences");
      return;
    }
    try {
      setIsLoading(true);
      await updateUserPreferences(userId, newPrefs);
      setUserPreferences(newPrefs);
      console.log('User preferences updated successfully.');
    } catch (error) {
      console.error('Error updating preferences in AuthContext:', error);
      // Opcional: podrías querer revertir userPreferences al estado anterior si la actualización falla
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMemoryNote = async (note: string) => {
    if (!userId) {
      console.error("handleAddMemoryNote: userId no disponible.");
      Alert.alert("Error", "No se pudo guardar la nota: Usuario no identificado.");
      return;
    }
    setIsLoading(true);
    try {
      const updatedNotes = await addExplicitMemoryNote(userId, note);
      if (updatedNotes !== null) {
        setExplicitMemoryNotes(updatedNotes);
        const confirmationMessage: Message = {
          id: generateMessageId(AI_ID),
          text: `✅ ¡Entendido! He guardado en memoria explícita: "${note}"`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        messageStore.addMessage(confirmationMessage);
      } else {
        Alert.alert("Error", "No se pudo guardar la nota en la memoria explícita.");
      }
    } catch (error) {
      logError(error, "AuthContext_handleAddMemoryNote");
      Alert.alert("Error", "Ocurrió un error al guardar la nota.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMemoryNote = async (noteToDelete: string) => {
    if (!userId) {
      console.error("handleDeleteMemoryNote: userId no disponible.");
      Alert.alert("Error", "No se pudo eliminar la nota: Usuario no identificado.");
      return;
    }
    setIsLoading(true);
    try {
      const updatedNotes = await deleteExplicitMemoryNote(userId, noteToDelete);
      if (updatedNotes !== null) {
        setExplicitMemoryNotes(updatedNotes);
        // Alert.alert("Nota Eliminada", "La nota ha sido eliminada de la memoria explícita.");
      } else {
        Alert.alert("Error", "No se pudo eliminar la nota de la memoria explícita.");
      }
    } catch (error) {
      logError(error, "AuthContext_handleDeleteMemoryNote");
      Alert.alert("Error", "Ocurrió un error al eliminar la nota.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMessage = async (messageData: Omit<Message, 'id' | 'timestamp'>) => {
    if (!userId || !currentConversationId) {
      console.error('Error: No hay usuario o ID de conversación para añadir mensaje.');
      logError(new Error('Attempted to add message without user or conversation ID'), 'handleAddMessageNoUserOrConv');
      return;
    }

    console.log(`>>> AuthContext: handleAddMessage llamado para conv: ${currentConversationId}, userMsg: ${messageData.isUser}`);
    
    const fullMessage: Message = {
      ...messageData,
      // Asegurarse de que 'isUser' está presente en messageData (Omit lo permite)
      id: generateMessageId(messageData.isUser ? userId : AI_ID), 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Actualizar MessageStore primero
    messageStore.addMessage(fullMessage);

    // Luego, persistir en Zep (y potencialmente Supabase)
    try {
      console.log(`>>> AuthContext: Agregando a Zep (conv: ${currentConversationId}): "${fullMessage.text.substring(0,30)}..."`);
      await addMessageToSession(currentConversationId, {
        message_id: fullMessage.id,
        role: fullMessage.isUser ? 'user' : 'ai',
        content: fullMessage.text,
        // metadata: fullMessage.localImageUri ? { image_url: fullMessage.localImageUri } : undefined // Ejemplo metadata
      });
      console.log('>>> AuthContext: Mensaje agregado a Zep exitosamente.');

      // Persistir en Supabase (solo mensajes de usuario por ahora, o según se decida)
      // if (isUserMessage) { // O si se quiere guardar todos
      //   await saveMessageToDb(userId, fullMessage.isUser ? 'user' : 'assistant', fullMessage.text, currentConversationId);
      // }

    } catch (error: unknown) { // Cambiado de any a unknown
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al guardar mensaje en Zep/Supabase';
      console.error('>>> AuthContext: Error en handleAddMessage al guardar en Zep/DB:', errorMessage);
      logError(error instanceof Error ? error : new Error(errorMessage), 'handleAddMessagePersistence');
      // Considerar si se debe revertir el mensaje del MessageStore o marcarlo como no enviado
    }
  };
  
  /**
   * Inicia una nueva conversación y la establece como conversación actual
   */
  const handleStartNewChat = async () => {
    if (!userId) {
      console.warn(">>> AuthContext: No se puede iniciar nueva conversación sin usuario");
      return;
    }
    
    setIsLoading(true);
    try {
      const newConvId = await startNewConversation(userId);
      setCurrentConversationId(newConvId);
      messageStore.setCurrentConversation(newConvId);
      console.log(`>>> AuthContext: Nueva conversación iniciada con ID: ${newConvId}`);
    } catch (error) {
      logError(error, "handleStartNewChat_creation");
      Alert.alert('Error', 'No se pudo iniciar una nueva conversación.');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Carga más mensajes (paginación)
   */
  const handleLoadMoreMessages = async (): Promise<boolean> => {
    try {
      return await messageStore.loadNextPage();
    } catch (error) {
      console.error("Error al cargar más mensajes:", error);
      logError(error, "handleLoadMoreMessages");
      return false;
    }
  };

  /**
   * Envía un mensaje al asistente IA y maneja la respuesta
   */
  const sendMessage = async (messageText: string, localImageUri?: string | null): Promise<boolean> => {
    setIsUserLoading(true); 
    let success = false;
    let publicImageUrl: string | undefined = undefined;
    
    try {
      if (!userId || !zepSessionId) {
        const errorMsg = "AuthContext.sendMessage: userId o zepSessionId no están disponibles.";
        console.error(errorMsg);
        const errorMessageForUI: Message = {
            id: generateMessageId(AI_ID),
          text: "Error: No se pudo enviar el mensaje. Falta ID de usuario o sesión.", 
          isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            animateTyping: false, 
            hasBeenAnimated: true, 
        };
        messageStore.addMessage(errorMessageForUI);
        setIsUserLoading(false);
        return false;
      }
      
      // 1. Subir imagen si se proporciona
      if (localImageUri) {
        try {
          publicImageUrl = await uploadImage(localImageUri);
        } catch (uploadError) {
          const errorMsg = `AuthContext.sendMessage: Error al subir la imagen: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
          console.error(errorMsg);
          logError(uploadError, 'sendMessage_uploadImage');
          const uploadFailedMessage: Message = {
            id: generateMessageId(AI_ID),
            text: "Error al subir la imagen. Por favor, inténtalo de nuevo.",
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            animateTyping: false,
            hasBeenAnimated: true,
          };
          messageStore.addMessage(uploadFailedMessage);
          setIsUserLoading(false);
          return false;
        }
      }

      // 2. Crear y añadir el mensaje del usuario a la UI localmente
      const userMessage: Message = {
        id: generateMessageId(userId),
        text: messageText,
        isUser: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        localImageUri: publicImageUrl,
      };
      messageStore.addMessage(userMessage);

      // 3. Preparar el mensaje para el servicio de IA
      const messageForAIService: AIMessage = {
        id: userMessage.id,
        text: messageText,
        isUser: true,
        timestamp: userMessage.timestamp,
        senderId: userId,
        role: 'user',
        imageUrl: publicImageUrl,
      };

      // 4. Llamar al servicio de IA SIN el JWT
      await sendMessageToAI(
        messageForAIService,
        userPreferences || DEFAULT_USER_PREFERENCES,
        zepSessionId,
        explicitMemoryNotes,
        user,
        'Texto'
      );
      
      success = true;

    } catch (error) {
      if (error instanceof SessionExpiredError) {
        const sessionExpiredMessage: Message = {
          id: generateMessageId(AI_ID),
          text: "Tu sesión ha expirado. Vuelve a iniciar sesión.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          animateTyping: false,
          hasBeenAnimated: true,
        };
        messageStore.addMessage(sessionExpiredMessage);
      } else {
        const errorMsgBase = 'Error enviando mensaje';
        console.error(`${errorMsgBase}: ${error instanceof Error ? error.message : String(error)}`);
        logError(error, 'sendMessage_general');
        
        const errorResponseMessage: Message = {
          id: generateMessageId(AI_ID),
          text: "Hubo un error al procesar tu solicitud. Por favor, inténtalo de nuevo.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          animateTyping: false,
          hasBeenAnimated: true,
        };
        messageStore.addMessage(errorResponseMessage);
      }
      success = false;
    } finally {
      setIsUserLoading(false); 
    }

    return success;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userPreferences,
        explicitMemoryNotes,
        messages,
        user_id: userId,
        zepSessionId,
        currentConversationId,
        isLoading,
        isUserLoading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        updatePreferences: handleUpdatePreferences,
        addMemoryNote: handleAddMemoryNote,
        deleteMemoryNote: handleDeleteMemoryNote,
        addMessage: handleAddMessage,
        startNewChat: handleStartNewChat,
        loadMoreMessages: handleLoadMoreMessages,
        sendMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
