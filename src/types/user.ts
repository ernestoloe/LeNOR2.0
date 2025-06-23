export interface UserPreferences {
  empathetic: boolean;
  confrontational: boolean;
  detailed: boolean;
  concise: boolean;
  creative: boolean;
  logical: boolean;
  nicknameForLenor?: string | null;
  workScheduleNotes?: string | null;
  hobbiesNotes?: string | null;
  relationshipsNotes?: string | null;
  customInstructions?: string;
  language?: string;
  voice_locale?: string;
}

export interface User {
  id: string;
  email: string;
  preferences?: UserPreferences;
  zep_session_id?: string | null;
}

/**
 * Define la estructura de un miembro de la familia.
 * Esta interfaz se usa tanto en la app como para mapear los datos de Supabase.
 */
export interface FamilyMember {
  email: string;
  name: string;
  aliases: string[];
  familyContext: string;
  preferences: string[];
  devModeCode?: string;
  isMinorRequiringAdult?: boolean;
} 