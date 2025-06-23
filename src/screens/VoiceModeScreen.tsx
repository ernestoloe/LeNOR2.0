import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Header } from '../components';
import { SafeAreaView } from 'react-native-safe-area-context';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { elevenLabsService } from '../services/elevenLabsService';
import { useNavigation } from '@react-navigation/native';
import { Message } from '../types/chat';
import { messageStore } from '../services/messageStore';

// En React Native (con Metro), los assets estáticos como las imágenes DEBEN cargarse con require().
// Usar 'import' es un patrón de web que aquí resulta en un error, ya que Metro no lo transpila para imágenes.
// La función require() devuelve un ID numérico del recurso en el build. Si la ruta es inválida,
// puede devolver null/undefined, lo que provoca un crash nativo fatal en iOS al ser pasado
// a un componente <Image> sin ser validado. Este bloque protege esa llamada.
let lenorIcon: number | null = null;
try {
  lenorIcon = require('../../assets/lenor-icon.png');
} catch (error) {
  console.error("CRITICAL: Fallo al cargar el asset 'lenor-icon.png'.", error);
}

enum VoiceModeState {
  Idle = 'IDLE',
  Listening = 'LISTENING',
  Processing = 'PROCESSING',
  GeneratingAudio = 'GENERATING_AUDIO',
  Speaking = 'SPEAKING',
  Error = 'ERROR'
}

const VoiceModeScreen: React.FC = () => {
  const { 
      userPreferences,
      sendMessage,
      zepSessionId,
      isLoading: isAuthLoading,
  } = useAuth();
  const navigation = useNavigation();
  const theme = useTheme();
  const componentStyles = styles(theme);
  
  const [voiceState, setVoiceState] = useState<VoiceModeState>(VoiceModeState.Idle);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const lastPlayedMessageId = useRef<string | null>(null);

  const voiceStateRef = useRef(voiceState);
  voiceStateRef.current = voiceState;

  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        setTranscript(e.value[0]);
      }
    };
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.error('Voice.onSpeechError:', e.error);
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
      elevenLabsService.stopPlayback();
    };
  }, []);

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

  useEffect(() => {
    const handleNewMessage = (messages: Message[]) => {
      if (!messages || !Array.isArray(messages) || messages.length === 0) return;
      if (voiceStateRef.current !== VoiceModeState.Processing) return;
      
      const lastAIMessage = messages.find(msg => 
        msg && !msg.isUser && msg.id && msg.text && msg.id !== lastPlayedMessageId.current
      );

      if (lastAIMessage) {
        setVoiceState(VoiceModeState.GeneratingAudio);
        lastPlayedMessageId.current = lastAIMessage.id;
        
        elevenLabsService.streamTextToSpeech(
          lastAIMessage.text,
          () => setVoiceState(VoiceModeState.Speaking),
          () => {
            setVoiceState(VoiceModeState.Idle);
            setError(null);
          },
          (err) => {
            console.error("Error en reproducción de audio:", err);
            setError('Error al reproducir la respuesta.');
            setVoiceState(VoiceModeState.Error);
            setTimeout(() => {
              setError(null);
              setVoiceState(VoiceModeState.Idle);
            }, 3000);
          }
        );
      } else {
        if (voiceStateRef.current === VoiceModeState.Processing) {
          setVoiceState(VoiceModeState.Idle);
        }
      }
    };

    const unsubscribe = messageStore.subscribe('update', handleNewMessage);
    return () => unsubscribe();
  }, []);

  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
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
      const locale = userPreferences?.voice_locale || 'es-MX';
      await Voice.start(locale);
    } catch (e) {
      console.error('Error al iniciar Voice.start', e);
      setError('No se pudo iniciar el reconocimiento de voz.');
      setVoiceState(VoiceModeState.Idle);
    }
  };

  const stopListeningAndProcess = async () => {
    try {
      setVoiceState(VoiceModeState.Processing);
      await Voice.stop();
      const currentTranscript = transcript.trim(); 
      setTranscript('');

      if (!currentTranscript) {
        setVoiceState(VoiceModeState.Idle);
        return;
      }

      await sendMessage(currentTranscript, null, 'Voz');
    } catch (e) {
      console.error('Error en stopListeningAndProcess', e);
      setError('Error al detener la escucha');
      setVoiceState(VoiceModeState.Error);
    }
  };

  const exitVoiceMode = async () => {
    try {
      if (voiceState === VoiceModeState.Listening) {
        await Voice.stop(); 
      }
      await Voice.destroy();
      await elevenLabsService.stopPlayback();

      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Chat' as never); 
      }
    } catch (e) {
      console.error("Error al salir del modo voz:", e);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Chat' as never);
      }
    }
  };

  const getTintColor = () => {
    switch (voiceState) {
      case VoiceModeState.Listening:   return '#4CAF50';
      case VoiceModeState.Processing:  return '#FFC107';
      case VoiceModeState.Speaking:    return '#2196F3';
      default:                          return theme.colors.text.secondary;
    }
  };

  const getLabel = () => {
    switch (voiceState) {
      case VoiceModeState.Listening:  return 'Escuchando... Pulsa para enviar';
      case VoiceModeState.Processing: return 'LéNOR está pensando...';
      case VoiceModeState.GeneratingAudio: return 'Generando audio...';
      case VoiceModeState.Speaking:   return 'LéNOR está hablando...';
      default:                         return 'Toca el ícono para hablar';
    }
  };

   return (
    <SafeAreaView style={componentStyles.safeArea} edges={['top']}>
      <Header title="LéNOR 1.5 - Voz" subtitle="Habla con LéNOR" />
      <View style={componentStyles.mainContent}> 
      {error && <Text style={componentStyles.errorText}>{error}</Text>}

      <View style={componentStyles.micContainer}> 
        <TouchableOpacity
          style={componentStyles.pulsatingMicButton} 
          onPress={voiceState === VoiceModeState.Listening ? stopListeningAndProcess : startListening}
            disabled={voiceState === VoiceModeState.Processing || voiceState === VoiceModeState.Speaking || isAuthLoading || !lenorIcon}
        >
          {lenorIcon && <Animated.Image
            source={lenorIcon}
            style={[
              componentStyles.micIcon, 
              { transform: [{ scale: pulseAnim }], tintColor: getTintColor() }
            ]}
          />}
        </TouchableOpacity>
        <Text style={componentStyles.micText}>{getLabel()}</Text>
        </View>
     
      <TouchableOpacity style={componentStyles.exitButton} onPress={exitVoiceMode}>
        <Animated.View style={componentStyles.exitContent}>
          <Ionicons name="exit-outline" size={20} style={componentStyles.exitIcon} />
          <Text style={componentStyles.exitText}>Salir de Modo Voz</Text>
        </Animated.View>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background.primary,
    flex: 1,
  },
  mainContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,    
  },
  errorText: { ...theme.typography.styles.caption, color: theme.colors.status.error, marginBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.md, textAlign: 'center' },
  micContainer: { 
    alignItems: 'center', 
    marginBottom: theme.spacing.lg 
  },
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
  micIcon: { 
    height: 80, 
    width: 80, 
  },
  micText: { ...theme.typography.styles.body1, color: theme.colors.text.secondary, marginTop: theme.spacing.sm },
  exitButton: { alignItems: 'center', backgroundColor: theme.colors.ui.button.secondary, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', margin: theme.spacing.md, padding: theme.spacing.sm },
  exitContent: { alignItems: 'center', flexDirection: 'row' },
  exitIcon: { color: theme.colors.text.primary, marginRight: theme.spacing.sm },
  exitText: { ...theme.typography.styles.body1, color: theme.colors.text.primary },
});

export default VoiceModeScreen;
