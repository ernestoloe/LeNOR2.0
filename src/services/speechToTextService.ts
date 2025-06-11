import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

// Interfaz para el estado del reconocimiento de voz
// interface SpeechRecognitionState { // Eliminada por no usarse
//   isListening: boolean;
//   transcript: string;
//   error: string | null;
// }

// Clase para manejar el reconocimiento de voz
export class SpeechToTextService {
  private isListening: boolean = false;
  private recognitionCallback: ((text: string) => void) | null = null;
  private errorCallback: ((error: string) => void) | null = null;

  constructor() {
    Voice.onSpeechResults = this.handleResults;
    Voice.onSpeechError = this.handleError;
  }

  // Iniciar reconocimiento de voz
  public async startListening(
    onTranscript: (text: string) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    console.log('>>> SpeechToTextService: startListening called');

    // --- GUARD: Prevent starting if already listening ---
    if (this.isListening) {
      console.warn('>>> SpeechToTextService: startListening called but already listening. Ignoring.');
      return;
    }
    // --- END GUARD ---

    try {
      // --- COMENTAR LA LÍNEA SOSPECHOSA --- 
      // console.log('>>> SpeechToTextService: Attempting Voice.destroy()');
      // await Voice.destroy().then(() => Voice.removeAllListeners());
      // console.log('>>> SpeechToTextService: Voice.destroy() completed');
      // --- FIN COMENTARIO ---

      this.recognitionCallback = onTranscript;
      this.errorCallback = onError || null;
      this.isListening = true;

      console.log('>>> SpeechToTextService: Setting Voice event handlers');
      Voice.onSpeechResults = this.handleResults;
      Voice.onSpeechError = this.handleError;

      console.log('>>> SpeechToTextService: Attempting Voice.start("es-MX")');
      await Voice.start('es-MX');
      console.log('>>> SpeechToTextService: Voice.start("es-MX") SUCCESSFUL');
    } catch (error: unknown) {
      console.error('>>> SpeechToTextService: Catch block hit', error);
      if (this.errorCallback) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al iniciar escucha';
        this.errorCallback(errorMessage);
      }
    }
  }

  // Detener reconocimiento de voz (Versión Simplificada)
  public async stopListening(): Promise<void> {
    try {
      console.log(">>> SpeechToTextService: Attempting Voice.stop()");
      await Voice.stop();
      console.log(">>> SpeechToTextService: Voice.stop() completed");
      this.isListening = false;
      // Limpiar listeners aquí después de detener
      console.log(">>> SpeechToTextService: Attempting Voice.destroy() after stop");
      await Voice.destroy(); // destroy también quita listeners implícitamente
      console.log(">>> SpeechToTextService: Voice.destroy() after stop completed");
    } catch (error: unknown) {
      console.error('>>> SpeechToTextService: Error during stopListening:', error);
      // Asegurarse de resetear el estado incluso si hay error al detener
      this.isListening = false;
    }
  }

  private handleResults = (e: SpeechResultsEvent) => {
    const result = e.value?.[0] || '';
    console.log(">>> SpeechToTextService: handleResults received:", result); // Log para ver resultados
    if (this.recognitionCallback) {
      this.recognitionCallback(result);
    }
  };

  private handleError = (e: SpeechErrorEvent) => {
    console.error('Error de reconocimiento:', e);
    // --- Reset listening state on error --- 
    this.isListening = false;
    // --- End Reset --- 
    if (this.errorCallback) {
      this.errorCallback(e.error?.message || 'Error desconocido de reconocimiento');
    }
  };

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public async cancelListening(): Promise<void> {
    try {
      await Voice.cancel();
      this.isListening = false;
    } catch (error) {
      console.error('Error al cancelar reconocimiento:', error);
    }
  }
}

export const speechToTextService = new SpeechToTextService();
