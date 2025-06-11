import { UserPreferences } from '../services/supabase';

// Función para formatear las preferencias del usuario en un formato legible para la IA
export const formatUserPreferences = (preferences: UserPreferences | null): string => {
  if (!preferences) {
    return '';
  }

  const preferencesArray = [];
  const customNotesArray = [];

  // Preferencias de estilo booleanas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (preferences.empathetic) {
    preferencesArray.push('Ser empático y mostrar comprensión emocional');
  }

  if (preferences.confrontational) {
    preferencesArray.push('Ser directo y confrontar al usuario con la verdad cuando sea necesario');
  }

  if (preferences.detailed) {
    preferencesArray.push('Proporcionar respuestas detalladas y completas');
  }

  if (preferences.concise) {
    preferencesArray.push('Mantener las respuestas breves y directas');
  }

  if (preferences.creative) {
    preferencesArray.push('Mostrar creatividad y originalidad en las respuestas');
  }

  if (preferences.logical) {
    preferencesArray.push('Mantener un enfoque lógico y estructurado');
  }

  // Nuevos campos de texto libre
  if (preferences.nicknameForLenor && preferences.nicknameForLenor.trim() !== '') {
    customNotesArray.push(`Forma de llamar a LéNOR: ${preferences.nicknameForLenor}`);
  }
  if (preferences.workScheduleNotes && preferences.workScheduleNotes.trim() !== '') {
    customNotesArray.push(`Notas sobre el horario laboral/estudios del usuario: ${preferences.workScheduleNotes}`);
  }
  if (preferences.hobbiesNotes && preferences.hobbiesNotes.trim() !== '') {
    customNotesArray.push(`Notas sobre los hobbies e intereses del usuario: ${preferences.hobbiesNotes}`);
  }
  if (preferences.relationshipsNotes && preferences.relationshipsNotes.trim() !== '') {
    customNotesArray.push(`Notas sobre las relaciones importantes del usuario: ${preferences.relationshipsNotes}`);
  }

  let formattedString = '';

  if (preferencesArray.length > 0) {
    formattedString += `Preferencias de estilo de LéNOR:\n${preferencesArray.map(pref => `- ${pref}`).join('\n')}`;
  } else {
    formattedString += 'Preferencias de estilo de LéNOR:\n- Estilo equilibrado por defecto.';
  }

  if (customNotesArray.length > 0) {
    formattedString += `\n\nInformación adicional proporcionada por el usuario:\n${customNotesArray.map(note => `- ${note}`).join('\n')}`;
  }

  return formattedString;
};

// Función para obtener el contexto temporal actual como valores separados
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTemporalContextValues = (): { fecha: string; hora: string; dia: string } => {
  const now = new Date();
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
  };
  const dayOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long'
  };

  const fecha = now.toLocaleDateString('es-MX', dateOptions);
  const hora = now.toLocaleTimeString('es-MX', timeOptions);
  const dia = now.toLocaleDateString('es-MX', dayOptions);
  
  // Eliminar la lógica de timeOfDay ya que no se pide en system.ts
  
  return { fecha, hora, dia };
};

// Función para construir el prompt completo
export const buildDynamicPrompt = (
  userMessage: string,
  systemInstructions: string,
  behaviorRules: string,
  userPreferences: UserPreferences | null
): string => {
  const formattedPreferences = formatUserPreferences(userPreferences);
  const { fecha, hora, dia } = getTemporalContextValues(); // Usar la nueva función
  
  // Incluir los valores con las etiquetas esperadas por system.ts
  const temporalContextString = 
`FECHA_ACTUAL: ${fecha}
HORA_ACTUAL: ${hora}
DIA_SEMANA: ${dia}`;

  return `${systemInstructions}

${temporalContextString}

${behaviorRules}

${formattedPreferences}

Mensaje del usuario: ${userMessage}`;
};
