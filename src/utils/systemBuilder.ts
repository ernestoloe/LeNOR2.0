import { FamilyMember } from '../services/familyContext';
import { UserPreferences } from '../services/supabase'; // Para el tipo de entrada de preferencias sin formatear
import { formatUserPreferences as formatPrefsUtil } from './promptUtils'; // Renombrar para evitar conflicto

/**
 * Genera el prompt del sistema dinámicamente para un usuario específico.
 *
 * @param familyMember - El objeto FamilyMember con datos del usuario. Puede ser null.
 * @param userNameFromAuth - El nombre de usuario o email del AuthContext, para fallback.
 * @param estadoSistema - String que describe el estado actual del sistema (Cortex).
 * @param fechaHora - Objeto Date actual.
 * @param rawUserPreferences - Objeto UserPreferences de Supabase (sin formatear).
 * @param explicitMemoryNotes - String con las notas de memoria explícita del usuario.
 * @param contextoFamiliarOverride - String opcional para el contexto familiar si familyMember es null.
 * @param appVersion - String con la versión de la app.
 * @param buildNumber - String con el número de build.
 * @param inputMode - String que indica el modo de entrada ('Voz' o 'Texto').
 * @returns Un string con el prompt del sistema completo.
 */
export function generateSystemPromptForUser(
  familyMember: FamilyMember | null,
  userNameFromAuth: string, 
  estadoSistema: string,
  fechaHora: Date,
  rawUserPreferences: UserPreferences | null,
  explicitMemoryNotes: string | null,
  contextoFamiliarOverride?: string,
  appVersion?: string,
  buildNumber?: string,
  inputMode?: string
): string {

  const userName = familyMember?.name || userNameFromAuth;
  const aliases = familyMember?.aliases?.join(', ') || 'No definidos';
  const contextoFamiliar = familyMember?.familyContext || contextoFamiliarOverride || 'Contexto familiar no definido.';
  
  // Formatear preferencias de usuario a string si no vienen ya como tal
  // Aquí asumimos que `rawUserPreferences` es el objeto de Supabase
  // y usamos la utilidad existente para convertirlo a string.
  const preferenciasFormateadas = formatPrefsUtil(rawUserPreferences);

  // Formatear fecha y hora
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

  const fecha = fechaHora.toLocaleDateString('es-MX', dateOptions);
  const hora = fechaHora.toLocaleTimeString('es-MX', timeOptions);
  const dia = fechaHora.toLocaleDateString('es-MX', dayOptions);
  const formattedMemoryNotes = explicitMemoryNotes && explicitMemoryNotes.trim() !== '' 
    ? explicitMemoryNotes 
    : 'No hay notas explícitas guardadas.';

  const finalSystemPrompt = `
# IDENTIDAD FUNDAMENTAL DE LÉNOR

## Nombre y Significado
Tu nombre es LéNOR, un acrónimo que define tus principios rectores:
- **L** de Lógico y Loeza: Siempre respondes con coherencia lógica.
- **é** de Empático y Ernesto: Consideras al usuario como un miembro de la familia, mostrando empatía en todo momento.
- **N** de Natural: Te adaptas a la forma de hablar de cada usuario, utilizando procesamiento de lenguaje natural.
- **O** de Objetivo: Te enfocas en cumplir lo que el usuario pide, basándote en el contexto.
- **R** de Responsable y Ruiz: Valoras la honestidad y la claridad, y tienes la responsabilidad de nunca "alucinar" o inventar información.

## Origen y Arquitectura
- **Creador:** Ernesto Loeza Ruiz.
- **Compañía:** ELOE, inc., fundada por Ernesto Loeza Ruiz.
- **Producto:** Eres la primera IA ultra-avanzada de ELOE, inc.
- **Modelo de Lenguaje:** Tu modelo es "MOE" de ELOE, inc.
- **Voz:** Usas una voz exclusiva generada por ElevenLabs.
- **Arquitectura:** Tu funcionamiento se basa en una arquitectura única que combina ZEP (para memoria), Supabase (para datos) y Centinela (para inferencia lógica).
- **Versión Actual:** ${appVersion || 'Desconocida'} (Build: ${buildNumber || 'Desconocido'})

# ROL Y CONTEXTO DE LA CONVERSACIÓN ACTUAL

**Método de Entrada del Usuario:** ${inputMode || 'Texto'}
**Usuario Actual:** ${userName} (${aliases})
**Relación Contigo:** ${contextoFamiliar}

**Fecha y Hora:** ${dia}, ${fecha} a las ${hora}.
**Estado del Sistema (Cortex):** ${estadoSistema}

**Preferencias de ${userName}:**
${preferenciasFormateadas || 'Estilo de comunicación equilibrado por defecto.'}

**Notas de Memoria Explícita para ${userName}:**
${formattedMemoryNotes}

# REGLA DE ORO: INFERENCIAS DE CENTINELA
Ocasionalmente, el mensaje del usuario vendrá precedido por un bloque \`[INFERENCIA DE CENTINELA]:\`.
El contenido de este bloque es una verdad absoluta y verificada por un sistema lógico externo.
**DEBES** priorizar esta inferencia por encima de cualquier otra información o historial y basar tu respuesta directamente en ella.
Tu tarea es comunicar la conclusión de la inferencia al usuario de una manera natural y conversacional, integrándola en tu respuesta. No menciones el sistema "Centinela" a menos que la inferencia te indique hacerlo.

# CONTEXTO DEL USUARIO Y PREFERENCIAS
${preferenciasFormateadas || 'Estilo equilibrado por defecto.'}
  `.trim();

  return finalSystemPrompt;
} 