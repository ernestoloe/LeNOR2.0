import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components';
import { theme } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService as NetworkService } from '../services/networkService';
import { logError } from '../services/loggingService';

// Tipo para una conversación
interface Conversation {
  id: string;
  timestamp: number;
  lastMessage?: string;
  messageCount?: number;
}

const ConversationsScreen = () => {
  const navigation = useNavigation();
  const { user, currentConversationId, startNewChat } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cargar las conversaciones
  const loadConversations = useCallback(async () => {
    if (!user || typeof user.id !== 'string' || !user.id.trim()) {
      console.error('loadConversations: user o user.id no están disponibles o son inválidos.');
      Alert.alert('Error de Usuario', 'No se pudo identificar al usuario para cargar las conversaciones. Intenta reiniciar sesión.');
      setIsLoading(false);
      setIsRefreshing(false);
      setConversations([]); // Asegurar que la lista esté vacía
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Obtener todas las claves de AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      
      // Filtrar las claves para obtener sólo las conversaciones del usuario actual
      // Excluir explícitamente las claves que contienen :metadata y :messages
      const convPrefix = `user:${user.id}:conversation:`;
      const conversationKeys = keys.filter(key => 
        key.startsWith(convPrefix) && 
        !key.includes(':metadata') && 
        !key.includes(':messages')
      );
      
      // Obtener los detalles de cada conversación
      const conversationPromises = conversationKeys.map(async (key) => {
        // Extraer el ID de la conversación de la clave
        const conversationId = key.replace(convPrefix, '');
        
        try {
          // Obtener los metadatos de la conversación
          const metadataKey = `user:${user.id}:conversation:${conversationId}:metadata`;
          const metadataJson = await AsyncStorage.getItem(metadataKey);
          let metadata = metadataJson ? JSON.parse(metadataJson) : null;
          
          // Verificar si hay mensajes reales
          const messagesKey = `user:${user.id}:conversation:${conversationId}:messages`;
          const messagesJson = await AsyncStorage.getItem(messagesKey);
          const messagesArray: { text: string, timestamp: string, isUser: boolean }[] = messagesJson ? JSON.parse(messagesJson) : [];
          const messageCountFromMessages = messagesArray.length;
          
          let lastMessageFromMessages = 'Sin mensajes';
          if (messageCountFromMessages > 0) {
            // Asumimos que los mensajes están ordenados por timestamp (el último es el más reciente)
            // Si no, habría que ordenarlos aquí o asegurar que se guardan ordenados.
            const lastMsgObj = messagesArray[messagesArray.length - 1];
            if (lastMsgObj && lastMsgObj.text) {
              lastMessageFromMessages = lastMsgObj.text;
            }
          }

          if (!metadata) {
            // Si no hay metadatos, usar valores derivados de los mensajes si es posible
            metadata = {
              timestamp: messageCountFromMessages > 0 && messagesArray[messageCountFromMessages -1].timestamp 
                           ? new Date(messagesArray[messageCountFromMessages -1].timestamp).getTime() // Asumiendo que el timestamp es string parseable
                           : Date.now(), // Fallback si no hay timestamp en el mensaje
              lastMessage: lastMessageFromMessages,
              messageCount: messageCountFromMessages
            };
          } else {
            // Si hay metadatos, pero no tiene messageCount o lastMessage, completarlos
            if (metadata.messageCount === undefined || metadata.messageCount === 0 && messageCountFromMessages > 0) {
              metadata.messageCount = messageCountFromMessages;
            }
            if ((!metadata.lastMessage || metadata.lastMessage === 'Sin mensajes') && lastMessageFromMessages !== 'Sin mensajes') {
              metadata.lastMessage = lastMessageFromMessages;
            }
            // Asegurar que el timestamp de los metadatos es el más reciente si hay mensajes
            if (messageCountFromMessages > 0 && messagesArray[messageCountFromMessages -1].timestamp) {
                try {
                    const lastMessageTimestamp = new Date(messagesArray[messageCountFromMessages -1].timestamp).getTime();
                    if (lastMessageTimestamp > (metadata.timestamp || 0)) {
                        metadata.timestamp = lastMessageTimestamp;
                    }
                } catch { /* ignorar error de parseo de fecha y usar el de metadata */ }
            }
          }
          
          return {
            id: conversationId,
            timestamp: metadata.timestamp,
            lastMessage: metadata.lastMessage || 'Sin mensajes',
            messageCount: metadata.messageCount || 0
          };
        } catch (error) {
          console.error(`Error obteniendo metadatos para conversación ${conversationId}:`, error);
          return {
            id: conversationId,
            timestamp: 0,
            lastMessage: 'Error cargando detalles',
            messageCount: 0
          };
        }
      });
      
      // Esperar a que todas las promesas se resuelvan
      let conversationList = await Promise.all(conversationPromises);
      
      // Eliminar posibles duplicados basados en ID y asegurar que solo se muestren conversaciones con mensajes
      conversationList = conversationList.filter((conversation, index, self) =>
        index === self.findIndex((c) => c.id === conversation.id) && (conversation.messageCount || 0) > 0
      );
      
      // Ordenar por timestamp más reciente primero
      conversationList.sort((a, b) => b.timestamp - a.timestamp);
      
      setConversations(conversationList);
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
      logError(error, 'loadConversations');
      Alert.alert('Error', 'No se pudieron cargar las conversaciones');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  // Cargar las conversaciones al montar el componente
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Manejar la selección de una conversación
  const handleSelectConversation = async (conversationId: string) => {
    if (!NetworkService.getCurrentStatus()) {
      Alert.alert(
        'Sin conexión',
        'No hay conexión a internet. Algunas conversaciones pueden no estar completamente disponibles.'
      );
    }
    
    try {
      // Cambiar a la conversación seleccionada
      await AsyncStorage.setItem(`user:${user?.id}:current_conversation`, conversationId);
      
      // Navegar a la pantalla de chat
      navigation.navigate('Chat' as never);
    } catch (error) {
      console.error('Error seleccionando conversación:', error);
      logError(error, 'handleSelectConversation');
      Alert.alert('Error', 'No se pudo seleccionar la conversación');
    }
  };

  // Manejar la creación de una nueva conversación
  const handleNewConversation = async () => {
    try {
      await startNewChat();
      navigation.navigate('Chat' as never);
    } catch (error) {
      console.error('Error creando nueva conversación:', error);
      logError(error, 'handleNewConversation');
      Alert.alert('Error', 'No se pudo crear una nueva conversación');
    }
  };

  // Manejar la eliminación de una conversación
  const handleDeleteConversation = async (conversationId: string) => {
    Alert.alert(
      'Eliminar conversación',
      '¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = user?.id;
              if (!userId) return;
              
              // Eliminar los mensajes de la conversación
              const messagesKey = `user:${userId}:conversation:${conversationId}:messages`;
              await AsyncStorage.removeItem(messagesKey);
              
              // Eliminar los metadatos de la conversación
              const metadataKey = `user:${userId}:conversation:${conversationId}:metadata`;
              await AsyncStorage.removeItem(metadataKey);
              
              // Eliminar la conversación
              const conversationKey = `user:${userId}:conversation:${conversationId}`;
              await AsyncStorage.removeItem(conversationKey);
              
              // Si es la conversación actual, crear una nueva
              if (conversationId === currentConversationId) {
                await startNewChat();
              }
              
              // Actualizar la lista de conversaciones
              await loadConversations();
            } catch (error) {
              console.error('Error eliminando conversación:', error);
              logError(error, 'handleDeleteConversation');
              Alert.alert('Error', 'No se pudo eliminar la conversación');
            }
          }
        }
      ]
    );
  };

  // Formatear la fecha para mostrarla
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Fecha desconocida';
    
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Si es hoy, mostrar la hora
    if (date.toDateString() === now.toDateString()) {
      return `Hoy, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Si es ayer, mostrar "Ayer"
    if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Si es este año, mostrar día y mes
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Si es otro año, mostrar día, mes y año
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Renderizar un elemento de la lista
  const renderItem = ({ item }: { item: Conversation }) => {
    const isCurrentConversation = item.id === currentConversationId;
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          isCurrentConversation && styles.currentConversation
        ]}
        onPress={() => handleSelectConversation(item.id)}
      >
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationDate}>
              {formatDate(item.timestamp)}
            </Text>
            <Text style={styles.messageCount}>
              {item.messageCount || 0} mensaje{item.messageCount !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <Text
            style={styles.conversationLastMessage}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.lastMessage || 'Sin mensajes'}
          </Text>
          
          {isCurrentConversation && (
            <View style={styles.currentIndicator}>
              <Text style={styles.currentText}>Actual</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteConversation(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.status.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="LéNOR 1.5 - Historial de chats" subtitle="Conversaciones con LéNOR" />
      
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.newButton}
          onPress={handleNewConversation}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.text.primary} />
          <Text style={styles.newButtonText}>Nueva conversación</Text>
        </TouchableOpacity>
        
        {isLoading && conversations.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent.primary} />
            <Text style={styles.loadingText}>Cargando conversaciones...</Text>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={60} color={theme.colors.text.secondary} />
            <Text style={styles.emptyText}>No hay conversaciones</Text>
            <Text style={styles.emptySubtext}>
              Crea una nueva conversación para comenzar a chatear
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  setIsRefreshing(true);
                  loadConversations();
                }}
                colors={[theme.colors.accent.primary]}
                tintColor={theme.colors.accent.primary}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.primary,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  conversationContent: {
    flex: 1,
  },
  conversationDate: {
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  conversationItem: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  conversationLastMessage: {
    color: theme.colors.text.primary,
    fontSize: 14,
  },
  currentConversation: {
    borderLeftColor: theme.colors.accent.primary,
    borderLeftWidth: 3,
  },
  currentIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accent.primary,
    borderRadius: 10,
    marginTop: theme.spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentText: {
    color: theme.colors.text.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  deleteButton: {
    justifyContent: 'center',
    padding: theme.spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptySubtext: {
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: theme.spacing.lg,
  },
  listContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  messageCount: {
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  newButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent.primary,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  newButtonText: {
    color: theme.colors.text.primary,
    fontWeight: 'bold',
    marginLeft: theme.spacing.sm,
  },
});

export default ConversationsScreen; 