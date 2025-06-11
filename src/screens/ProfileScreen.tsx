import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Switch, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Container, Header, Card, Button } from '../components';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { UserPreferences } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SAVED_KEY = 'user_preferences_last_saved_timestamp';

// Función para formatear el timestamp
const formatLastSavedTimestamp = (timestamp: number | null): string | null => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return `Preferencias actualizadas el ${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} · ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
};

const ProfileScreen = () => {
  const { userPreferences, updatePreferences, isLoading: authLoading } = useAuth();
  
  // Estado local para todas las preferencias, incluyendo los nuevos campos de texto
  const [localPreferences, setLocalPreferences] = useState<UserPreferences>(() => {
    // Función de inicialización para asegurar que todos los campos tengan un valor por defecto
    const defaults: UserPreferences = {
    empathetic: false,
    confrontational: false,
    detailed: false,
    concise: false,
    creative: false,
    logical: false,
      nicknameForLenor: '',
      workScheduleNotes: '',
      hobbiesNotes: '',
      relationshipsNotes: '',
    };
    return defaults;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(null);

  useEffect(() => {
    if (userPreferences) {
      // Fusionar userPreferences con los defaults para asegurar que todos los campos estén presentes
      setLocalPreferences(prev => ({
        ...prev, // Mantiene la estructura por defecto si algo falta en userPreferences
        ...userPreferences, // Sobrescribe con los valores reales de userPreferences
        nicknameForLenor: userPreferences.nicknameForLenor || '',
        workScheduleNotes: userPreferences.workScheduleNotes || '',
        hobbiesNotes: userPreferences.hobbiesNotes || '',
        relationshipsNotes: userPreferences.relationshipsNotes || '',
      }));
    }
    const loadTimestamp = async () => {
      const storedTimestamp = await AsyncStorage.getItem(LAST_SAVED_KEY);
      if (storedTimestamp) {
        setLastSavedTimestamp(parseInt(storedTimestamp, 10));
      }
    };
    loadTimestamp();
  }, [userPreferences]);

  // Handler para campos de texto
  const handleTextChange = (key: keyof UserPreferences, value: string) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Toggle handler para preferencias booleanas
  const togglePreference = (key: keyof Pick<UserPreferences, 'empathetic' | 'confrontational' | 'detailed' | 'concise' | 'creative' | 'logical'>) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const savePreferences = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      const booleanPrefs = {
        empathetic: !!localPreferences.empathetic,
        confrontational: !!localPreferences.confrontational,
        detailed: !!localPreferences.detailed,
        concise: !!localPreferences.concise,
        creative: !!localPreferences.creative,
        logical: !!localPreferences.logical,
      };

      const hasContradictions = Object.entries(booleanPrefs).some(([key, value]) => {
        if (!value) return false;
        switch (key) {
          case 'detailed': return booleanPrefs.concise;
          case 'concise': return booleanPrefs.detailed;
          case 'empathetic': return booleanPrefs.confrontational;
          case 'confrontational': return booleanPrefs.empathetic;
          case 'creative': return booleanPrefs.logical;
          case 'logical': return booleanPrefs.creative;
          default: return false;
        }
      });

      if (hasContradictions) {
        Alert.alert('Error', 'No puedes tener preferencias de personalidad contradictorias activas al mismo tiempo.');
        return;
      }

      // localPreferences ya tiene la estructura UserPreferences completa
      // y los valores por defecto (strings vacíos) si no se han modificado.
      await updatePreferences(localPreferences); 
      setSaveSuccess(true);
      
      const now = Date.now();
      await AsyncStorage.setItem(LAST_SAVED_KEY, now.toString());
      setLastSavedTimestamp(now);

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'No se pudieron guardar tus preferencias. Por favor, intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Nuevas preguntas de texto libre
  const textInputQuestions: Array<{ key: keyof UserPreferences; label: string; placeholder: string; multiline?: boolean; numberOfLines?: number }> = [
    { key: 'nicknameForLenor', label: '1. ¿Cómo te gustaría que LéNOR te llame?', placeholder: 'Ej: Mi nombre, un apodo especial...' },
    { key: 'workScheduleNotes', label: '2. Horario laboral o agenda que te gustaría que LéNOR tome en consideración:', placeholder: 'Ej: Trabajo de 9 a 5, tengo clases por la tarde...', multiline: true, numberOfLines: 3 },
    { key: 'hobbiesNotes', label: '3. Hobbies, pasatiempos o algo que te gustaría compartir con LéNOR:', placeholder: 'Ej: Me gusta leer, pintar, los videojuegos...', multiline: true, numberOfLines: 3 },
    { key: 'relationshipsNotes', label: '4. Relaciones personales que te gustaría compartir (pareja, amigos):', placeholder: 'Ej: Mi pareja se llama X, mi mejor amigo Y...', multiline: true, numberOfLines: 3 },
  ];

  const booleanPreferenceQuestions: Array<{ key: keyof Pick<UserPreferences, 'empathetic' | 'confrontational' | 'detailed' | 'concise' | 'creative' | 'logical'>; question: string }> = [
    { key: 'empathetic', question: '¿Prefieres respuestas empáticas?' },
    { key: 'confrontational', question: '¿Quieres que LéNOR te confronte?' },
    { key: 'detailed', question: '¿Prefieres respuestas detalladas?' },
    { key: 'concise', question: '¿Prefieres respuestas breves?' },
    { key: 'creative', question: '¿Valoras la creatividad?' },
    { key: 'logical', question: '¿Prefieres un enfoque lógico?' },
  ];

  const isContradictoryDisabled = (key: keyof Pick<UserPreferences, 'empathetic' | 'confrontational' | 'detailed' | 'concise' | 'creative' | 'logical'>): boolean => {
    // Accedemos directamente a las propiedades booleanas conocidas de localPreferences
    switch (key) {
      case 'detailed': return !!localPreferences.concise;
      case 'concise': return !!localPreferences.detailed;
      case 'empathetic': return !!localPreferences.confrontational;
      case 'confrontational': return !!localPreferences.empathetic;
      case 'creative': return !!localPreferences.logical;
      case 'logical': return !!localPreferences.creative;
      default: return false;
    }
  };

  return (
    <Container>
      <Header title="LéNOR - Tu Perfil" subtitle="Personaliza tu experiencia con LéNOR" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card title="Sobre ti y tus preferencias" style={styles.card} loading={authLoading}>
          <Text style={styles.description}>
            Responde a estas preguntas para ayudar a LéNOR a conocerte mejor y adaptar sus interacciones.
          </Text>
          
          {/* Nuevos campos de texto libre */}
          {textInputQuestions.map((item) => (
            <View key={item.key as string} style={styles.textInputContainer}>
              <Text style={styles.textInputLabel}>{item.label}</Text>
              <TextInput
                style={[styles.textInput, item.multiline && styles.textInputMultiline]}
                value={localPreferences[item.key] as string || ''}
                onChangeText={(text) => handleTextChange(item.key, text)}
                placeholder={item.placeholder}
                placeholderTextColor={theme.colors.text.tertiary}
                multiline={item.multiline}
                numberOfLines={item.multiline ? item.numberOfLines : 1}
                editable={!authLoading && !isSaving}
              />
            </View>
          ))}

          <Text style={[styles.description, styles.personalityHeader]}>
            Define la personalidad de LéNOR:
          </Text>
          
          {/* Preferencias booleanas en bloques de dos */}
          <View style={styles.booleanPreferencesGrid}>
            {booleanPreferenceQuestions.map((item) => (
              <View key={item.key} style={styles.preferenceItemWide}>
                <Text style={styles.preferenceQuestion}>{item.question}</Text>
                <Switch
                  value={!!localPreferences[item.key]}
                  onValueChange={() => togglePreference(item.key)}
                  trackColor={{ false: theme.colors.ui.button.secondary, true: theme.colors.accent.tertiary }}
                  thumbColor={localPreferences[item.key] ? theme.colors.accent.primary : theme.colors.text.secondary}
                  disabled={authLoading || isSaving || isContradictoryDisabled(item.key)}
                />
              </View>
            ))}
          </View>
          
          {lastSavedTimestamp && (
            <Text style={styles.lastSavedText}>
              {formatLastSavedTimestamp(lastSavedTimestamp)}
            </Text>
          )}

          <View style={styles.saveButton}>
            <Button
              title={isSaving ? "Guardando..." : saveSuccess ? "Guardado ✓" : "Guardar Cambios"}
              onPress={savePreferences}
              variant="primary"
              size="large"
              fullWidth
              disabled={authLoading || isSaving}
            />
          </View>
          
          {(isSaving || authLoading) && ( // Mostrar loader si authLoading o isSaving
            <ActivityIndicator 
              size="small" 
              color={theme.colors.accent.primary} 
              style={styles.loader} 
            />
          )}
        </Card>
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  booleanPreferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  description: {
    ...theme.typography.styles.body1,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  lastSavedText: {
    ...theme.typography.styles.caption,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  loader: {
    marginTop: theme.spacing.md,
  },
  personalityHeader: {
    ...theme.typography.styles.h4,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  preferenceItemWide: {
    alignItems: 'center',
    borderBottomColor: theme.colors.ui.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    width: '100%',
  },
  preferenceQuestion: {
    ...theme.typography.styles.body1,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.md,
  },
  saveButton: {
    marginTop: theme.spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.md,
  },
  textInput: {
    ...theme.typography.styles.body1,
    backgroundColor: theme.colors.ui.input.background,
    borderColor: theme.colors.ui.divider,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    color: theme.colors.text.primary,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  textInputContainer: {
    marginBottom: theme.spacing.lg,
  },
  textInputLabel: {
    ...theme.typography.styles.body2,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  textInputMultiline: {
    minHeight: 80,
    paddingTop: theme.spacing.sm,
    textAlignVertical: 'top',
  },
});

export default ProfileScreen;
