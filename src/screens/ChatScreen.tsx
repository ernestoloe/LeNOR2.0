import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, TouchableOpacity, Image, Text } from 'react-native';
import { Container, Header, Input, Button } from '../components';
import { MessageBubble } from '../components/MessageBubble';
import { Message } from '../types/chat';
import { useAuth } from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { messageStore } from '../services/messageStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isVoiceMode } from '../services/settingsService';
import { networkService as NetworkService } from '../services/networkService';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme';

// --- Definir la frase clave para guardar memoria --- 
const MEMORY_KEYWORDS = ["guarda en memoria:", "memoria:","Guarda en memoria:"];
// -------------------------------------------------

// Definir tipos para los mensajes renderizables
// type RenderableMessage = Message & { key: string }; // Eliminada por no usarse

const ChatScreen: React.FC = () => {
  const { 
    sendMessage, 
    isLoading: isAuthLoading, 
    addMemoryNote, 
    loadMoreMessages 
  } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  // Estado local que se usa para forzar re-renders cuando cambia el messageStore
  const [localMessages, setLocalMessages] = useState<Message[]>(messageStore.getMessages());
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  
  // Referencias para control de estado
  const isConnected = useRef(NetworkService.getCurrentStatus());
  const hasUnsentMessages = useRef(false);

  // Efecto para suscribirse a los cambios en el messageStore
  useEffect(() => {
    const unsubscribe = messageStore.subscribe('update', setLocalMessages);
    return () => unsubscribe();
  }, []);

  // Manejar errores de mensajes (solo para depuración)
  useEffect(() => {
    if (!Array.isArray(localMessages)) {
      console.error('>>> ChatScreen: localMessages no es un array:', typeof localMessages);
    } else {
      const invalidMessages = localMessages.filter(msg => !msg || !msg.id || !msg.text);
      if (invalidMessages.length > 0) {
        console.warn(`>>> ChatScreen: Hay ${invalidMessages.length} mensajes inválidos en el store.`, invalidMessages);
      }
    }
  }, [localMessages]);

  // Efectos al montar el componente
  useEffect(() => {
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
        await sendMessage(textToSend, imageUriToSend, 'Texto');

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
      console.error("Error crítico en handleSendMessage:", error);
      Alert.alert("Error", "Ha ocurrido un error fatal al enviar el mensaje. Por favor intenta nuevamente.");
      setIsSending(false);
    }
  };

  const renderMessageItem = useCallback(({ item }: { item: Message }) => {
    // Validación robusta del mensaje
    if (!item) {
      console.warn('ChatScreen: Mensaje nulo recibido en renderMessageItem');
      return null;
    }
    
    if (!item.id || !item.text || typeof item.text !== 'string') {
      console.error('ChatScreen: Mensaje inválido:', {
        hasId: !!item.id,
        hasText: !!item.text,
        textType: typeof item.text,
        item: item
      });
      return null;
    }
    
    if (typeof item.isUser !== 'boolean') {
      console.error('ChatScreen: Mensaje con isUser inválido:', item);
        return null;
      }
      
      return (
        <MessageBubble
        key={item.id}
          messageObject={item}
        />
      );
  }, []);

  return (
    <Container>
      <Header title="LéNOR 2.0 - Chat" subtitle="Platica con LéNOR" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={insets.top + 10}
      >
    <FlatList
      ref={flatListRef}
      data={localMessages}
      keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
      contentContainerStyle={styles.messagesContainer}
      inverted={true}
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
        if (messageStore.getPaginationInfo().hasMore) {
          loadMoreMessages();
        }
      }}
      onEndReachedThreshold={0.5}
    />

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
            title={isSending ? "Enviando..." : "Enviar"} 
            onPress={handleSendMessage}
            disabled={isSending || (inputText.trim() === '' && !selectedImageUri)}
            style={styles.sendButton}
          />
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
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
  sendButton: {
    marginLeft: theme.spacing.sm,
  },
});

export default ChatScreen;

