declare module '@env' {
  // Ya no usamos @env, pero mantenemos el archivo por si acaso
  // o si se usa en otro lado.
  // Las variables ahora se acceden via process.env.EXPO_PUBLIC_...
  // No es estrictamente necesario declararlas aquí si no usas @env,
  // pero no hace daño dejarlas por claridad.
  
  // OpenRouter (LLM API)
  export const EXPO_PUBLIC_OPENROUTER_MODEL: string;
  export const EXPO_PUBLIC_OPENROUTER_API_KEY: string;
  export const EXPO_PUBLIC_AI_TEMPERATURE: string;
  export const EXPO_PUBLIC_AI_MAX_TOKENS: string;
  
  // ElevenLabs (Voice API)
  export const EXPO_PUBLIC_ELEVENLABS_VOICE_ID: string;
  export const EXPO_PUBLIC_ELEVENLABS_API_KEY: string;
  
  // Supabase (Base de datos)
  export const EXPO_PUBLIC_SUPABASE_URL: string;
  export const EXPO_PUBLIC_SUPABASE_KEY: string;
  
  // Zep (Memoria a largo plazo)
  export const EXPO_PUBLIC_ZEP: string;
  export const EXPO_PUBLIC_ZEP_API_URL: string;
  
  // Añade aquí otras variables de entorno que uses
}

declare module '*.png' {
  import { ImageSourcePropType } from 'react-native';
  const value: ImageSourcePropType;
  export default value;
}

declare module '*.jpg' {
  import { ImageSourcePropType } from 'react-native';
  const value: ImageSourcePropType;
  export default value;
}

declare module '*.jpeg' {
  import { ImageSourcePropType } from 'react-native';
  const value: ImageSourcePropType;
  export default value;
}

declare module '*.gif' {
  import { ImageSourcePropType } from 'react-native';
  const value: ImageSourcePropType;
  export default value;
} 