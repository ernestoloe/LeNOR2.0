import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, TouchableOpacity, Image, Text } from 'react-native';
import { Container, Header, MessageBubble, Input, Button } from '../components';
import { Message } from '../types/chat';
import { useAuth } from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { logError } from '../services/loggingService';
import { messageStore } from '../services/messageStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isVoiceMode } from '../services/settingsService';
import { networkService as NetworkService } from '../services/networkService';
import { useTheme } from '../contexts/ThemeContext';

// --- Definir la frase clave para guardar memoria --- 
const MEMORY_KEYWORDS = ["guarda en memoria:", "memoria:"];
// -------------------------------------------------

// Definir tipos para los mensajes renderizables
// type RenderableMessage = Message & { key: string }; // Eliminada por no usarse

const ChatScreen: React.FC = () => {
  const { 
    messages, 
    sendMessage, 
    isLoading: isAuthLoading, 
      addMemoryNote, 
    loadMoreMessages 
  } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  // Estado local que se usa para forzar re-renders cuando cambia el messageStore
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const prevMessagesLengthRef = useRef(0);
  
  // Referencias para control de estado
  const isConnected = useRef(NetworkService.getCurrentStatus());
  const hasUnsentMessages = useRef(false);

  // Efecto para suscribirse a los cambios en el messageStore
  useEffect(() => {
    console.log('>>> ChatScreen: Iniciando...');
    
    // Obtener mensajes actuales del MessageStore
    const currentMessages = messageStore.getMessages();
    setLocalMessages(currentMessages);
    console.log(`>>> ChatScreen: Estado inicial cargado. Mensajes: ${currentMessages.length}`);
    
    // Suscribirse a actualizaciones
    const unsubscribe = messageStore.subscribe('update', (updatedMessages) => {
      console.log(`>>> ChatScreen: MessageStore actualizado, nuevo count: ${updatedMessages.length}`);
      setLocalMessages(updatedMessages);
    });
    
    return () => {
      console.log('>>> ChatScreen: Limpiando suscripción...');
      unsubscribe();
    };
  }, []);

  // Usar los mensajes del MessageStore como fuente principal
  const displayMessages = localMessages;
  
  // Manejar errores de mensajes
  useEffect(() => {
    if (!Array.isArray(displayMessages)) {
      console.error('>>> ChatScreen: displayMessages no es un array:', typeof displayMessages);
      logError(new Error(`displayMessages no es un array: ${typeof displayMessages}`), 'ChatScreen_displayMessages');
    }
  }, [displayMessages]);

  // DEBUG: Log de mensajes en cada renderizado con información mejorada
  useEffect(() => {
    console.log(`>>> ChatScreen [RENDER]: Local Messages: ${localMessages.length}, Auth Messages: ${messages.length}`);
    console.log(`>>> ChatScreen [RENDER]: Display Messages: ${displayMessages.length}`);
    
    if (displayMessages?.length > 0) {
      console.log(`>>> ChatScreen [RENDER]: First message: ${JSON.stringify(displayMessages[0])}`);
      console.log(`>>> ChatScreen [RENDER]: Last message: ${JSON.stringify(displayMessages[displayMessages.length - 1])}`);
    }
    
    // Verificar si hay mensajes nulos o malformados
    if (Array.isArray(displayMessages)) {
      const invalidMessages = displayMessages.filter(msg => !msg || !msg.id || !msg.text);
      if (invalidMessages.length > 0) {
        const error = new Error(`Hay ${invalidMessages.length} mensajes inválidos`);
        logError(error, "ChatScreen_invalidMessages");
        console.warn("Mensajes inválidos:", invalidMessages);
      }
    }
  }, [localMessages, messages, displayMessages]);

  // Efecto para hacer scroll al final cuando llegan nuevos mensajes
  useEffect(() => {
    // Con FlatList inverted, el scroll automático al final para nuevos mensajes es manejado nativamente
    // Este useEffect podría ser necesario solo para scrolls manuales o en casos muy específicos.
    // Por ahora, lo mantenemos simple, ya que la inversión debería ayudar.
    if (flatListRef.current && displayMessages.length > prevMessagesLengthRef.current) {
        // No es necesario llamar a scrollToEnd({ animated: true }) explícitamente con inverted=true
        // flatListRef.current?.scrollToEnd({ animated: true });
    }
    prevMessagesLengthRef.current = displayMessages.length;
  }, [displayMessages]); 

  // Efectos al montar el componente
  useEffect(() => {
    // Comprobar estado de VoiceMode
    const checkVoiceMode = async () => {
      await isVoiceMode();
    };
    
    checkVoiceMode();
    
    // Suscribirse a cambios de red
    const unsubscribeNetwork = NetworkService.addListener((connected: boolean) => {
      console.log(`ChatScreen: Estado de conexión cambiado a ${connected ? 'conectado' : 'desconectado'}`);
      isConnected.current = connected;
      
      // Si recuperamos conexión y hay mensajes pendientes
      if (connected && hasUnsentMessages.current) {
        Alert.alert(
          "Conexión restaurada",
          "Se ha restaurado la conexión a internet. Los mensajes pendientes se enviarán automáticamente."
        );
        hasUnsentMessages.current = false;
      }
    });
    
    return () => {
      unsubscribeNetwork();
    };
  }, []);

  const handlePickImage = async () => {
    const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaLibraryStatus !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para seleccionar fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handleSendMessage = async () => {
    try {
      const messageText = inputText.trim();
      if (messageText === '' && !selectedImageUri) return;

      const keywordInfo = MEMORY_KEYWORDS.map(k => ({ keyword: k, index: messageText.toLowerCase().indexOf(k) })).find(k => k.index === 0);

      if (keywordInfo) {
        const noteToSave = messageText.substring(keywordInfo.keyword.length).trim();
          if (noteToSave) {
          setIsSending(true);
              try {
                  await addMemoryNote(noteToSave);
              } catch (error) {
                  Alert.alert('Error', 'No se pudo guardar la nota en la memoria.');
              } finally {
            setIsSending(false);
              }
          } else {
            messageStore.addMessage({ id: Date.now().toString(), text: `Para guardar algo, escribe la palabra clave seguida de lo que quieres que recuerde.`, isUser: false, timestamp: new Date().toLocaleTimeString() });
          }
          setInputText('');
          return; 
      }

      const textToSend = messageText;
      const imageUriToSend = selectedImageUri;
      
      // Limpiar los campos de entrada inmediatamente
      setInputText('');
      setSelectedImageUri(null);

      // El mensaje del usuario ya no se añade aquí para evitar duplicados.
      // El AuthContext se encargará de añadirlo al messageStore.

      // 2. Llamar a la función `sendMessage` del contexto. 
      //    Ella se encargará de subir la imagen, llamar a la IA, y añadir la respuesta.
      setIsSending(true);
      try {
        // Esta única llamada reemplaza toda la lógica anterior de subida y llamada a la IA.
        await sendMessage(textToSend, imageUriToSend);

      } catch (error) {
          // El contexto ya gestiona los errores de la IA y los muestra en el chat.
          // Este log es para depuración adicional si es necesario.
          console.error('Error al llamar a context.sendMessage desde ChatScreen:', error);
          // Opcional: añadir un mensaje de error genérico si el del contexto falla
          await messageStore.addMessage({ id: Date.now().toString(), text: '❌ Hubo un error al contactar al asistente.', isUser: false, timestamp: new Date().toLocaleTimeString() });
      } finally {
        setIsSending(false);
      }

    } catch (error) {
      logError(error, "handleSendMessage_critical");
      Alert.alert("Error", "Ha ocurrido un error fatal al enviar el mensaje. Por favor intenta nuevamente.");
      setIsSending(false);
    }
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    try {
      // Verificación de validez del mensaje
      if (!item || typeof item.text !== 'string') {
        const errorMsg = `Mensaje inválido recibido en renderMessage: ${JSON.stringify(item)}`;
        console.error(errorMsg);
        logError(new Error(errorMsg), "renderMessage_invalidItem");
        return null;
      }
      
      return (
        <MessageBubble
          messageObject={item}
        />
      );
    } catch (error) {
      logError(error, "renderMessage_critical");
      return null;
    }
  }, []);

  const renderMessageList = () => (
    <FlatList
      ref={flatListRef}
      data={displayMessages}
      keyExtractor={(item) => item.id}
      renderItem={renderMessage}
      contentContainerStyle={styles.messagesContainer}
      inverted={true}
      onContentSizeChange={() => {
        // Con inverted, el scroll al inicio (que ahora es el final visual)
        // para el primer mensaje ya no es tan directo como antes.
        // La FlatList invertida maneja esto mejor.
        // if (displayMessages.length === 1) { 
        //     flatListRef.current?.scrollToEnd({animated: true});
        // }
      }}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {isAuthLoading ? "Cargando mensajes..." : "No hay mensajes."}
          </Text>
        </View>
      }
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={10}
      onEndReached={() => {
        console.log(">>> ChatScreen: FlatList onEndReached triggered");
        if (messageStore.getPaginationInfo().hasMore) {
          loadMoreMessages();
        }
      }}
      onEndReachedThreshold={0.5}
    />
  );

  return (
    <Container>
      <Header title="LéNOR 2.0 - Chat" subtitle="Platica con LéNOR" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={insets.top + 10}
      >
        {renderMessageList()}

        {isSending && <ActivityIndicator style={styles.historyLoader} size="small" color={theme.colors.accent.primary} />}

        <View style={styles.inputContainer}>
          {selectedImageUri && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
              <TouchableOpacity onPress={() => setSelectedImageUri(null)} style={styles.removePreviewButton}>
                <Ionicons name="close-circle" size={20} color={theme.colors.status.error} />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={handlePickImage} style={styles.attachButton}>
            <Ionicons name="attach" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          <Input
            placeholder="Escribe un mensaje para Lénor..."
            value={inputText}
            onChangeText={setInputText}
            containerStyle={styles.textInput}
            multiline
            editable={!isSending}
          />
          <Button
            title="Enviar"
            onPress={handleSendMessage}
            variant="primary"
            size="medium"
            disabled={isSending || (inputText.trim() === '' && !selectedImageUri)}
          />
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  attachButton: {
    paddingHorizontal: theme.spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  historyLoader: {
    marginVertical: theme.spacing.md,
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderTopColor: theme.colors.ui.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    padding: theme.spacing.md,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  previewContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.borderRadius.md,
    bottom: 70, // This might need adjustment based on input height
    elevation: 3,
    flexDirection: 'row',
    left: theme.spacing.md,
    padding: theme.spacing.sm,
    position: 'absolute',
    right: theme.spacing.md,
    shadowColor: theme.colors.background.primary,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  previewImage: {
    borderRadius: theme.borderRadius.sm,
    height: 50,
    marginRight: theme.spacing.sm,
    width: 50,
  },
  removePreviewButton: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 10,
    position: 'absolute',
    right: -5,
    top: -5,
  },
  textInput: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
});

export default ChatScreen;
