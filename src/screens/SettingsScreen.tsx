import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, ActivityIndicator, Switch, Linking, TouchableOpacity } from 'react-native';
import { Container, Header, Card, Button } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isVoiceMode, toggleVoiceMode } from '../services/settingsService';
import Constants from 'expo-constants';
import { getSystemStatusObject } from '../services/cortexService';

interface SystemStatus {
  network: string;
  zep: string;
  zepFriendly: string;
  supabase: string;
}

const SettingsScreen = () => {
  const theme = useTheme();
  const { user, signOut, isLoading, userPreferences, explicitMemoryNotes, zepSessionId, deleteMemoryNote } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [storageSize, setStorageSize] = useState('Calculando...');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const appVersion = Constants.expoConfig?.version || 'N/A';
  const styles = createStyles(theme);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const enabled = await isVoiceMode();
        setVoiceModeEnabled(enabled);
      } catch (error) {
        console.error("Error cargando voice mode:", error);
      }
    
      try {
        const keys = await AsyncStorage.getAllKeys();
        let totalSize = 0;
        for (const key of keys) {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            totalSize += value.length;
          }
        }
        if (totalSize > 1024 * 1024) {
          setStorageSize(`${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
        } else if (totalSize > 1024) {
          setStorageSize(`${(totalSize / 1024).toFixed(2)} KB`);
        } else {
          setStorageSize(`${totalSize} bytes`);
        }
      } catch (error) {
        console.error('Error calculando tamaño de almacenamiento:', error);
        setStorageSize('Error al calcular');
      }

      try {
        const status = await getSystemStatusObject(zepSessionId || null);
        setSystemStatus(status);
      } catch (error) {
        console.error('Error cargando estado del sistema:', error);
        setSystemStatus(null);
      }
    };

    loadInitialData();
  }, [zepSessionId]);

  const handleVoiceModeToggle = async () => {
    try {
      const newStatus = await toggleVoiceMode();
      setVoiceModeEnabled(newStatus);
    } catch (error) {
      console.error('Error cambiando modo voz:', error);
      Alert.alert('Error', 'No se pudo cambiar el modo voz');
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Limpiar caché',
      '¿Estás seguro que deseas limpiar toda la caché? Esto eliminará todos los datos almacenados localmente pero mantendrá tu cuenta.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              await AsyncStorage.multiRemove(keys);
              setStorageSize('0 bytes');
              Alert.alert('Éxito', 'Caché limpiada correctamente');
            } catch (error) {
              console.error('Error limpiando caché:', error);
              Alert.alert('Error', 'No se pudo limpiar la caché');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSigningOut(true);
              await signOut();
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
              Alert.alert('Error', 'No se pudo cerrar sesión');
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteNote = async (noteToDelete: string) => {
    Alert.alert(
      "Eliminar Nota",
      `¿Estás seguro de que quieres eliminar la nota: "${noteToDelete}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMemoryNote(noteToDelete);
              // Opcional: Mostrar confirmación o dejar que la UI se actualice por el AuthContext
            } catch (error) {
              console.error('Error eliminando nota desde SettingsScreen:', error);
              Alert.alert("Error", "No se pudo eliminar la nota.");
            }
          },
        },
      ]
    );
  };

  // Convertir el string de notas en un array para mostrar
  const memoryNotesArray = explicitMemoryNotes
    ? explicitMemoryNotes.split('\n').map(note => note.startsWith('- ') ? note.substring(2) : note).filter(Boolean)
    : [];

  return (
    <Container>
      <Header title="LéNOR 2.0 - Configuración" subtitle="Ajustes de la app." />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card title="Información de Usuario" style={styles.card} loading={isLoading}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user?.email || 'No disponible'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.techTitle}>LéNOR IA 2.0</Text>
            <View style={styles.specsContainer}>
              <View style={styles.specRow}>
                <Ionicons name="hardware-chip-outline" size={16} color={theme.colors.accent.primary} style={styles.specIcon} />
                <Text style={styles.specText}><Text style={styles.specLabel}>Arquitectura:</Text> Mixture of Experts (MOE) de ELOE, inc.</Text>
              </View>
              <View style={styles.specRow}>
                <Ionicons name="expand-outline" size={16} color={theme.colors.accent.primary} style={styles.specIcon} />
                <Text style={styles.specText}><Text style={styles.specLabel}>Contexto:</Text> Ventana Masiva de 1.04 Millones de Tokens</Text>
              </View>
              <View style={styles.specRow}>
                <Ionicons name="server-outline" size={16} color={theme.colors.accent.primary} style={styles.specIcon} />
                <Text style={styles.specText}><Text style={styles.specLabel}>Memoria:</Text> Híbrida Avanzada (Supabase + Zep Framework)</Text>
              </View>
              <View style={styles.specRow}>
                <Ionicons name="library-outline" size={16} color={theme.colors.accent.primary} style={styles.specIcon} />
                <Text style={styles.specText}><Text style={styles.specLabel}>Dataset:</Text> Dual Propietario (ELOE, inc. y Hugging Face Repository)</Text>
              </View>
              <View style={styles.specRow}>
                <Ionicons name="volume-medium-outline" size={16} color={theme.colors.accent.primary} style={styles.specIcon} />
                <Text style={styles.specText}><Text style={styles.specLabel}>Voz:</Text> Síntesis Exclusiva ElevenLabs (Voz LÉNOR)</Text>
              </View>
              <View style={styles.specRow}>
                <Ionicons name="scan-outline" size={16} color={theme.colors.accent.secondary} style={styles.specIcon} />
                <Text style={[styles.specText, styles.inDevelopment]}><Text style={styles.specLabel}>Análisis Imagen:</Text> En desarrollo (próximamente)</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Memoria Explícita Guardada:</Text>
            {memoryNotesArray.length > 0 ? (
              <View style={styles.memoryNotesContainer}>
                {memoryNotesArray.map((note, index) => (
                  <View key={index} style={styles.memoryNoteItem}>
                    <Text style={styles.memoryNoteText}>{note}</Text>
                    <TouchableOpacity onPress={() => handleDeleteNote(note)} style={styles.deleteNoteButton}>
                      <Ionicons name="trash-outline" size={20} color={theme.colors.status.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.infoValue}>No hay notas guardadas</Text>
            )}
          </View>
        </Card>
        
        <Card title="Diagnóstico del Sistema" style={styles.card} loading={isLoading || !systemStatus}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>ID Sesión Zep:</Text>
            <Text style={styles.debugValue}>{zepSessionId || 'No disponible'}</Text>
          </View>
          {systemStatus && (
            <>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Estado Red:</Text>
                <Text style={styles.debugValue}>{systemStatus.network}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Estado Zep (Interno):</Text>
                <Text style={styles.debugValue}>{systemStatus.zep}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Estado Zep (Amigable):</Text>
                <Text style={styles.debugValue}>{systemStatus.zepFriendly}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Estado Supabase:</Text>
                <Text style={styles.debugValue}>{systemStatus.supabase}</Text>
              </View>
            </>
          )}
        </Card>
        
        <Card title="Preferencias" style={styles.card}>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Modo voz:</Text>
            <Switch 
              value={voiceModeEnabled}
              onValueChange={handleVoiceModeToggle}
              trackColor={{ false: theme.colors.ui.button.secondary, true: theme.colors.accent.primary }}
              thumbColor={theme.colors.background.primary}
            />
          </View>
          
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Preferencias activas:</Text>
            <View style={styles.tagsContainer}>
              {userPreferences?.empathetic && <View style={styles.tag}><Text style={styles.tagText}>Empático</Text></View>}
              {userPreferences?.confrontational && <View style={styles.tag}><Text style={styles.tagText}>Confrontativo</Text></View>}
              {userPreferences?.detailed && <View style={styles.tag}><Text style={styles.tagText}>Detallado</Text></View>}
              {userPreferences?.concise && <View style={styles.tag}><Text style={styles.tagText}>Conciso</Text></View>}
              {userPreferences?.creative && <View style={styles.tag}><Text style={styles.tagText}>Creativo</Text></View>}
              {userPreferences?.logical && <View style={styles.tag}><Text style={styles.tagText}>Lógico</Text></View>}
              {!userPreferences?.empathetic && !userPreferences?.confrontational && !userPreferences?.detailed && !userPreferences?.concise && !userPreferences?.creative && !userPreferences?.logical &&
                <View style={[styles.tag, styles.noPrefsTag]}><Text style={styles.tagText}>Sin preferencias activas</Text></View>
              }
            </View>
          </View>
        </Card>
        
        <Card title="Almacenamiento" style={styles.card}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Espacio utilizado:</Text>
            <Text style={styles.infoValue}>{storageSize}</Text>
          </View>
          
          <Button
            title="Limpiar caché"
            onPress={handleClearCache}
            variant="secondary"
            size="medium"
            icon={<Ionicons name="trash-outline" size={18} color={theme.colors.text.primary} />}
            style={styles.button}
          />
        </Card>
        
        <Card title="Ajustes de la Aplicación" style={styles.card}>
          <View style={styles.settingItem}>
            <Text style={styles.infoLabel}>Versión de la App:</Text>
            <Text style={styles.infoValue}>{appVersion}</Text>
          </View>
        </Card>
        
        <Card style={styles.card}>
          <Button
            title={isSigningOut ? "Cerrando sesión..." : "Cerrar Sesión"}
            onPress={handleLogout}
            variant="secondary"
            size="large"
            fullWidth
            icon={<Ionicons name="log-out-outline" size={20} color={theme.colors.text.primary} />}
            disabled={isLoading || isSigningOut}
          />
          
          {isSigningOut && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.colors.accent.primary} />
              <Text style={styles.loadingText}>Cerrando sesión...</Text>
            </View>
          )}
        </Card>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>LéNOR 2.0 by ELOE,inc. © 2025</Text>
        </View>
      </ScrollView>
    </Container>
  );
};

const createStyles = (theme) => StyleSheet.create({
  button: {
    marginTop: 20,
  },
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderColor: theme.colors.ui.divider,
    marginBottom: 16,
  },
  clearLogsButton: {
    marginTop: 10,
    backgroundColor: theme.colors.accent.tertiary,
  },
  clearLogsButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  debugHeaderContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  debugLogEntry: {
    color: theme.colors.text.secondary,
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 5,
  },
  debugValue: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: theme.colors.accent.primary,
    flexWrap: 'wrap',
  },
  debugValueSmall: {
    ...theme.typography.styles.caption,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    color: theme.colors.text.secondary,
    fontFamily: 'monospace',
    marginTop: 5,
    padding: 10,
  },
  deleteNoteButton: {
    padding: 5,
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    ...theme.typography.styles.caption,
    color: theme.colors.text.tertiary,
    marginBottom: 5,
  },
  inDevelopment: {
    color: theme.colors.text.disabled,
  },
  infoItem: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ui.divider,
    paddingBottom: 15,
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.primary,
  },
  linkItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 15,
  },
  linkText: {
    color: theme.colors.accent.primary,
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.primary,
    marginLeft: 10,
  },
  loader: {
    marginTop: 10,
  },
  logsScrollView: {
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: 8,
    maxHeight: 200,
    padding: 10,
  },
  memoryNotesContainer: {
    marginTop: 5,
  },
  memoryNoteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ui.divider,
  },
  memoryNoteText: {
    flex: 1,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    fontSize: 14,
  },
  noPrefsTag: {
    backgroundColor: theme.colors.ui.divider,
  },
  preferenceItem: {
    marginBottom: 10,
  },
  preferenceLabel: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.secondary,
    marginBottom: 5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  specIcon: {
    marginRight: 10,
  },
  specLabel: {
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.secondary,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  specText: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.primary,
  },
  specsContainer: {
    paddingLeft: 10,
  },
  tag: {
    backgroundColor: theme.colors.accent.tertiary,
    borderRadius: 8,
    marginBottom: 5,
    marginRight: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    color: theme.colors.text.primary,
    fontSize: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  techTitle: {
    fontSize: 20,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.primary,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ui.divider,
    paddingTop: 15,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  settingItem: {
    marginBottom: 20,
  },
});

export default SettingsScreen;
