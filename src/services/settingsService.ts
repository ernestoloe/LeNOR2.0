import AsyncStorage from '@react-native-async-storage/async-storage';

// Clave para almacenar el estado del modo voz
const VOICE_MODE_KEY = 'settings_voice_mode';

/**
 * Verifica si el modo voz está activado
 * @returns Promise<boolean> Estado del modo voz
 */
export const isVoiceMode = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(VOICE_MODE_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error al obtener el estado del modo voz:', error);
    return false;
  }
};

/**
 * Alterna el estado del modo voz
 * @returns Promise<boolean> Nuevo estado del modo voz
 */
export const toggleVoiceMode = async (): Promise<boolean> => {
  try {
    const currentMode = await isVoiceMode();
    const newMode = !currentMode;
    await AsyncStorage.setItem(VOICE_MODE_KEY, newMode.toString());
    return newMode;
  } catch (error) {
    console.error('Error al cambiar el estado del modo voz:', error);
    return false;
  }
}; 