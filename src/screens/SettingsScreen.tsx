import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, ActivityIndicator, Switch, Linking, TouchableOpacity, Modal } from 'react-native';
import { Container, Header, Card, Button } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isVoiceMode, toggleVoiceMode } from '../services/settingsService';
import Constants from 'expo-constants';
import { getSystemStatusObject } from '../services/cortexService';
import { Theme } from '../theme';

interface SystemStatus {
  network: string;
  zep: string;
  zepFriendly: string;
  supabase: string;
}

const SettingsScreen = () => {
  const theme = useTheme();
  const { user, signOut, isLoading, userPreferences, explicitMemoryNotes, zepSessionId, deleteMemoryNote, updatePreferences } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [storageSize, setStorageSize] = useState('Calculando...');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const appVersion = Constants.expoConfig?.version || 'N/A';
  const styles = createStyles(theme);

  const availableLanguages = [
    { label: 'Español (MX)', value: 'es-MX' },
    { label: 'English (US)', value: 'en-US' },
    { label: 'Português (BR)', value: 'pt-BR' },
  ];

  const currentLanguageLabel = availableLanguages.find(lang => lang.value === userPreferences?.voice_locale)?.label || 'Seleccionar';

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

  const handleLanguageChange = async (newLocale: string) => {
    if (userPreferences) {
      try {
        const newPrefs = { ...userPreferences, voice_locale: newLocale };
        await updatePreferences(newPrefs);
      } catch (error) {
        console.error('Error actualizando el idioma:', error);
        Alert.alert('Error', 'No se pudo guardar la preferencia de idioma.');
      } finally {
        setLanguageModalVisible(false);
      }
    }
  };

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
            } catch (error) {
              console.error('Error eliminando nota desde SettingsScreen:', error);
              Alert.alert("Error", "No se pudo eliminar la nota.");
            }
          },
        },
      ]
    );
  };

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
                <Text style={styles.specText}><Text style={styles.specLabel}>Dataset:</Text> Propietario (ELOE, inc.)</Text>
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

        <Card title="Ajustes de la App" style={styles.card} loading={isLoading}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Modo Voz por Defecto</Text>
            <Switch
              trackColor={{ false: theme.colors.background.tertiary, true: theme.colors.accent.primary }}
              thumbColor={theme.colors.background.primary}
              onValueChange={handleVoiceModeToggle}
              value={voiceModeEnabled}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Idioma de Voz</Text>
            <TouchableOpacity style={styles.languageSelector} onPress={() => setLanguageModalVisible(true)}>
              <Text style={styles.languageSelectorText}>{currentLanguageLabel}</Text>
              <Ionicons name="chevron-down" size={18} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Limpiar Caché Local</Text>
            <Button
              title={storageSize}
              onPress={handleClearCache}
              variant="secondary"
            />
          </View>
        </Card>

        <Button
          title={isSigningOut ? "Cerrando Sesión..." : "Cerrar Sesión"}
          onPress={handleLogout}
          variant="secondary"
          style={styles.logoutButton}
          disabled={isSigningOut}
        />
        
        <Text style={styles.versionText}>Versión de la App: {appVersion}</Text>
        
      </ScrollView>
      <Modal
        animationType="fade"
        transparent={true}
        visible={languageModalVisible}
        onRequestClose={() => {
          setLanguageModalVisible(false);
        }}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setLanguageModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Idioma de Voz</Text>
            {availableLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.value}
                style={styles.modalOption}
                onPress={() => handleLanguageChange(lang.value)}
              >
                <Text style={styles.modalOptionText}>{lang.label}</Text>
                {userPreferences?.voice_locale === lang.value && (
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.status.success} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </Container>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  scrollContent: {
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  infoItem: {
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
  },
  infoLabel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  debugValue: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontFamily: 'monospace',
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.sm,
    borderRadius: 4,
  },
  techTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  specsContainer: {
    paddingLeft: theme.spacing.md,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  specIcon: {
    marginRight: theme.spacing.md,
  },
  specText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    flex: 1,
  },
  specLabel: {
    fontWeight: '600',
  },
  inDevelopment: {
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  memoryNotesContainer: {
    marginTop: theme.spacing.sm,
  },
  memoryNoteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    marginBottom: theme.spacing.xs,
  },
  memoryNoteText: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 14,
  },
  deleteNoteButton: {
    marginLeft: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.tertiary,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
  },
  languageSelectorText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  logoutButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.status.error,
  },
  versionText: {
    textAlign: 'center',
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.tertiary,
  },
  modalOptionText: {
    fontSize: 18,
    color: theme.colors.text.primary,
  },
});

export default SettingsScreen;