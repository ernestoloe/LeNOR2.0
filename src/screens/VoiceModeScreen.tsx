import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Platform, // Necesario para permisos
  // eslint-disable-next-line react-native/split-platform-components
  PermissionsAndroid, // Necesario para permisos en Android
} from 'react-native';
import { Header } from '../components'; // Restaurar importación de Header
import { SafeAreaView } from 'react-native-safe-area-context';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice'; // Se eliminó SpeechRecognizedEvent
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av'; // Restaurar para permisos de audio
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { sendMessageToAI as callSendMessageToAI, AIMessage } from '../services/aiService'; // Renombrar para evitar conflicto con sendMessage de Zep
import { elevenLabsService } from '../services/elevenLabsService'; // Importar la instancia del servicio
// import { logError } from '../services/loggingService'; // logError no se usa
import iconLeNOR from '../../assets/lenor-icon.png';
import { generateMessageId } from '../utils/id';
import { useNavigation } from '@react-navigation/native'; // Restaurar para navegación
// import TextToSpeech from '../services/TextToSpeech'; // Implied import for TextToSpeech
import * as Speech from 'expo-speech'; // Importar expo-speech
import { supabase } from '../services/supabase'; // Importar supabase
import { messageStore } from '../services/messageStore'; // Importar messageStore

enum VoiceModeState {
  Idle = 'IDLE',
  Listening = 'LISTENING',
  Processing = 'PROCESSING',
  Speaking = 'SPEAKING',
  Error = 'ERROR'
}

const VoiceModeScreen: React.FC = () => {
  const { 
      userPreferences, 
      addMessage,
      zepSessionId,
      isLoading: isAuthLoading,
      user_id: userId,
      user,
      explicitMemoryNotes,
  } = useAuth();
  const navigation = useNavigation(); // Hook de navegación
  
  const [voiceState, setVoiceState] = useState<VoiceModeState>(VoiceModeState.Idle);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  // const [isMounted, setIsMounted] = useState(true); // No se usa
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        setTranscript(e.value[0]);
      }
    };
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.error('Voice.onSpeechError:', e.error);

      // Manejo específico para el error "No speech detected"
      const noSpeechMessage = "No speech detected";
      if (e.error?.message?.includes(noSpeechMessage)) {
        setError("No te escuché. Toca el ícono para intentarlo de nuevo.");
      } else {
        setError(e.error?.message || 'Error en reconocimiento de voz');
      }
      
      setVoiceState(VoiceModeState.Idle);
    };
    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(e => console.error("Error en Voice.destroy en cleanup:", e));
      elevenLabsService.stopPlayback(); // Usar el método de la instancia del servicio
    };
  }, []);

  // Pulse for processing and responding
  useEffect(() => {
    if (voiceState === VoiceModeState.Processing || voiceState === VoiceModeState.Speaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, easing: Easing.linear, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voiceState, pulseAnim]);

  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Permiso de Micrófono",
            message: "LéNOR necesita acceso a tu micrófono para el modo voz.",
            buttonNeutral: "Pregúntame Luego",
            buttonNegative: "Cancelar",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      const permission = await Audio.requestPermissionsAsync();
      return permission.status === 'granted';
    }
  };

  const startListening = async () => {
    if (!zepSessionId) {
        setError('Error interno: No se pudo obtener la sesión.');
        setVoiceState(VoiceModeState.Idle);
        return;
    }
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      setError('Permiso de micrófono denegado.');
      setVoiceState(VoiceModeState.Idle);
        return;
      }
    try {
      setVoiceState(VoiceModeState.Listening);
      setError(null);
      setTranscript('');
      await Voice.start('es-MX');
    } catch (e) {
      console.error('Error al iniciar Voice.start', e);
      setError('Error al iniciar escucha');
      setVoiceState(VoiceModeState.Idle);
    }
  };

  const stopListeningAndProcess = async () => {
    try {
      setVoiceState(VoiceModeState.Processing);
      await Voice.stop();
      const currentTranscript = transcript.trim(); 
      setTranscript(''); // Limpiar para la próxima vez

      if (!zepSessionId || !userId) {
          setError('Error interno: Sesión o usuario perdido.');
          setVoiceState(VoiceModeState.Idle);
          return;
      }

      if (currentTranscript) { 
        const userMessageId = generateMessageId(userId);
        
        // Añadir el mensaje del usuario a la UI para que se vea en el chat
        messageStore.addMessage({
          id: userMessageId,
          text: currentTranscript,
          isUser: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        
        setVoiceState(VoiceModeState.Processing); // Permanece en procesamiento

        const userMessageForAI: AIMessage = {
            id: userMessageId,
            text: currentTranscript,
            isUser: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            senderId: userId,
            role: 'user'
        };

        try {
          const aiResponseText = await callSendMessageToAI(
            userMessageForAI,
            userPreferences || {
              empathetic: true,
              confrontational: false,
              detailed: true,
              concise: false,
              creative: true,
              logical: true
            },
            zepSessionId,
            explicitMemoryNotes,
            user,
            'Voz'
          );

          if (aiResponseText) {
            setVoiceState(VoiceModeState.Speaking);
            await elevenLabsService.streamTextToSpeech(aiResponseText);
            setVoiceState(VoiceModeState.Idle);
          } else {
            setError('LéNOR no generó una respuesta de texto.');
            setVoiceState(VoiceModeState.Error);
          }
          
        } catch (aiError) {
          console.error('Error en la respuesta de IA (VoiceMode):', aiError);
          setError('LéNOR no pudo procesar tu voz en este momento.');
          setVoiceState(VoiceModeState.Error);
        }
      } else {
        setVoiceState(VoiceModeState.Idle); // No había nada que procesar
      }
    } catch (e) {
      console.error('Error en stopListeningAndProcess', e);
      setError('Error al detener la escucha');
      setVoiceState(VoiceModeState.Error);
    }
  };

  const exitVoiceMode = async () => {
    try {
      // Detener cualquier escucha activa ANTES de destruir
      // Comprobar el estado interno o si Voice tiene un método isListening()
      // Por ahora, asumimos que si voiceState es Listening, debemos parar.
      if (voiceState === VoiceModeState.Listening) {
        console.log(">>> VoiceModeScreen.exitVoiceMode: Voice state is Listening, attempting Voice.stop()");
        await Voice.stop(); 
        console.log(">>> VoiceModeScreen.exitVoiceMode: Voice.stop() completed.");
      }
      console.log(">>> VoiceModeScreen.exitVoiceMode: Attempting Voice.destroy()");
      await Voice.destroy();
      console.log(">>> VoiceModeScreen.exitVoiceMode: Voice.destroy() completed.");
      await elevenLabsService.stopPlayback(); // Usar el método de la instancia del servicio

      // Navegar DESPUÉS de la limpieza
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Chat' as never); 
      }
    } catch (e) {
      console.error("Error al salir del modo voz:", e);
      // Incluso si hay error en la limpieza, intentar navegar para no bloquear al usuario
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Chat' as never);
      }
    }
  };

  // Determine tint color by state
  const getTintColor = () => {
    switch (voiceState) {
      case VoiceModeState.Listening:   return '#4CAF50';   // green
      case VoiceModeState.Processing:  return '#FFC107';   // yellow
      case VoiceModeState.Speaking:    return '#2196F3';   // blue
      default:                          return theme.colors.text.secondary;
    }
  };

  // Determine label by state
  const getLabel = () => {
    switch (voiceState) {
      case VoiceModeState.Listening:  return 'Escuchando... Pulsa para enviar';
      case VoiceModeState.Processing: return 'LéNOR Procesando...';
      case VoiceModeState.Speaking:   return 'LéNOR Hablando...';
      default:                         return 'Toca el ícono para hablar';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="LéNOR 1.5 - Voz" subtitle="Habla con LéNOR" />
      <View style={styles.mainContent}> 
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.micContainer}> 
        <TouchableOpacity
          style={styles.pulsatingMicButton} 
          onPress={voiceState === VoiceModeState.Listening ? stopListeningAndProcess : startListening}
            disabled={voiceState === VoiceModeState.Processing || voiceState === VoiceModeState.Speaking || isAuthLoading}
        >
          <Animated.Image
            source={iconLeNOR}
            style={[
              styles.micIcon, 
              { transform: [{ scale: pulseAnim }], tintColor: getTintColor() }
            ]}
          />
        </TouchableOpacity>
        <Text style={styles.micText}>{getLabel()}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.exitButton} onPress={exitVoiceMode}>
        <Animated.View style={styles.exitContent}>
          <Ionicons name="exit-outline" size={20} style={styles.exitIcon} />
          <Text style={styles.exitText}>Salir de Modo Voz</Text>
        </Animated.View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  errorText: { ...theme.typography.styles.caption, color: theme.colors.status.error, marginBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.md, textAlign: 'center' },
  exitButton: { alignItems: 'center', backgroundColor: theme.colors.ui.button.secondary, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', margin: theme.spacing.md, padding: theme.spacing.sm },
  exitContent: { alignItems: 'center', flexDirection: 'row' },
  exitIcon: { color: theme.colors.text.primary, marginRight: theme.spacing.sm },
  exitText: { ...theme.typography.styles.body1, color: theme.colors.text.primary },
  mainContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,    
  },
  micContainer: { 
    alignItems: 'center', 
    marginBottom: theme.spacing.lg 
  },
  micIcon: { 
    height: 80, 
    width: 80, 
  },
  micText: { ...theme.typography.styles.body1, color: theme.colors.text.secondary, marginTop: theme.spacing.sm },
  pulsatingMicButton: { 
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 75, 
    elevation: 8,
    height: 150,
    justifyContent: 'center', 
    shadowColor: theme.colors.background.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    width: 150, 
  },
  safeArea: {
    backgroundColor: theme.colors.background.primary,
    flex: 1,
  }
});

export default VoiceModeScreen;
