// ElevenLabs streaming TTS integrado con Audio de ELOE
// import { Platform } from 'react-native'; // Eliminado por no usarse
import * as FileSystem from 'expo-file-system';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid, AVPlaybackStatus } from 'expo-av';

const API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;
const VOICE_ID = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID!;

export class ElevenLabsService {
  private sound: Audio.Sound | null = null;
  private tempFilePath: string = '';
  private isStreaming: boolean = false;
  private abortController: AbortController | null = null;

  public async streamTextToSpeech(
    text: string,
    onStart?: () => void,
    onComplete?: () => void,
    onError?: (error: unknown) => void
  ): Promise<void> {
    // --- LOG PARA VERIFICAR LA CLAVE USADA --- 
    console.log('>>> ElevenLabsService: Using API Key:', API_KEY ? `${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 5)}` : 'UNDEFINED'); // Muestra inicio y fin para verificar sin exponerla toda
    console.log('>>> ElevenLabsService: Using Voice ID:', VOICE_ID);
    // --- FIN LOG ---
    try {
      await this.stopPlayback();
      this.isStreaming = true;
      this.abortController = new AbortController();

      // Configurar el modo de audio antes de comenzar
      await this.setupAudioMode();

      // Crear archivo temporal para el streaming
      this.tempFilePath = `${FileSystem.cacheDirectory}tts_${Date.now()}.aac`;
      
      // Asegurarse de que el archivo no existe
      try {
        const fileHandle = await FileSystem.getInfoAsync(this.tempFilePath);
        if (fileHandle.exists) {
          await FileSystem.deleteAsync(this.tempFilePath);
        }
      } catch (error) {
        console.warn('Error al verificar archivo temporal:', error);
      }

      // Iniciar la solicitud de streaming
      const response = await fetch(`${API_URL}/${VOICE_ID}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': API_KEY,
          'Accept': 'audio/aac',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.75,
            speed: 1.05
          },
          output_format: 'aac_22050_48',
        }),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(`LéNOR TTS API error: ${response.status} - ${JSON.stringify(errData)}`);
      }

      // Obtener el stream completo primero
      const arrayBuffer = await response.arrayBuffer();
      const base64Data = this.arrayBufferToBase64(arrayBuffer);
      
      // Escribir el archivo completo
      await FileSystem.writeAsStringAsync(this.tempFilePath, base64Data, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Iniciar la reproducción
      const { sound } = await Audio.Sound.createAsync(
        { uri: this.tempFilePath },
        { shouldPlay: true },
        this.onPlaybackStatusUpdate(onComplete)
      );

      this.sound = sound;
      onStart?.();

    } catch (error) {
      console.error('Error en streaming de LéNOR TTS:', error);
      onError?.(error);
    } finally {
      this.isStreaming = false;
      this.abortController = null;
    }
  }

  private async setupAudioMode(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error configurando modo de audio:', error);
      throw error;
    }
  }

  private onPlaybackStatusUpdate(onComplete?: () => void) {
    return (status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        this.stopPlayback();
        onComplete?.();
      }
    };
  }

  public async stopPlayback(): Promise<void> {
    this.isStreaming = false;
    
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }

    if (this.tempFilePath) {
      try {
      await FileSystem.deleteAsync(this.tempFilePath, { idempotent: true });
      } catch (error) {
        console.warn('Error eliminando archivo temporal:', error);
      }
      this.tempFilePath = '';
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export const elevenLabsService = new ElevenLabsService();
