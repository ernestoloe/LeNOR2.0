import { UserPreferences } from './supabase';

/**
 * TYPES - Definiciones de las estructuras de datos que usa Centinela
 */
interface CentinelaContext {
  datetime: Date;
  userId: string;
  userPreferences: UserPreferences | null;
  // Podríamos añadir más contexto si es necesario, como el estado de la app, etc.
}

interface UserInput {
  rawText: string;
  // El 'topic' podría ser inferido por una IA más simple en el futuro, por ahora lo omitimos.
}

/**
 * La función principal de Centinela. Analiza la entrada del usuario y su contexto
 * para generar una inferencia que guiará a la IA principal.
 * 
 * @param message - La entrada de texto crudo del usuario.
 * @returns Una cadena de texto con la inferencia o `null` si no hay nada que inferir.
 */
export const analizarYGenerarInferencia = (
  message: { rawText: string }
): string | null => {
  const texto = message.rawText.toLowerCase();

  // 1. Detección de intención de guardar en memoria (ejemplo simple)
  const palabrasClaveMemoria = ['recuerda que', 'no olvides que', 'toma nota de que', 'apunta que'];
  for (const palabra of palabrasClaveMemoria) {
    if (texto.startsWith(palabra)) {
      const insight = texto.substring(palabra.length).trim();
      // En lugar de devolver el texto, generamos una inferencia sobre la *intención*
      return `El usuario quiere que guarde la siguiente información en la memoria a largo plazo: "${insight}".`;
    }
  }

  // 2. Detección de preguntas sobre el estado del sistema (ejemplo simple)
  const preguntasEstado = ['cómo estás', 'cómo te sientes', 'cuál es tu estado', 'status'];
  if (preguntasEstado.some(p => texto.includes(p))) {
    return 'El usuario está preguntando por mi estado actual o cómo me siento.';
  }

  // 3. Detección de un saludo simple
  const saludos = ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'qué tal'];
  if (saludos.some(s => texto.trim() === s)) {
    return 'El usuario está iniciando la conversación con un saludo simple.';
  }

  // Si no se detecta ninguna intención específica, devolver null
  return null;
};

/**
 * Helper para analizar la ambigüedad de la palabra "mañana", especialmente si el
 * usuario acaba de despertar en la madrugada.
 */
function analizarAmbiguedadTemporal(input: UserInput, context: CentinelaContext): string | null {
  const texto = input.rawText.toLowerCase();
  const hora = context.datetime.getHours();

  // Condición: La pregunta incluye "mañana" y la hora es entre 00:00 y 04:00 AM.
  // Podríamos hacerlo más inteligente si tuviéramos un estado 'userJustWokeUp'.
  const esAmbiguo = texto.includes('mañana') && (hora >= 0 && hora <= 4);

  if (esAmbiguo) {
    const hoy = new Date(context.datetime);
    const manana = new Date(context.datetime);
    manana.setDate(hoy.getDate() + 1);

    const esLaboralHoy = esDiaLaboral(hoy, context.userPreferences?.hobbiesNotes || ''); // Asumimos que holidays está en hobbiesNotes por ahora
    const esLaboralManana = esDiaLaboral(manana, context.userPreferences?.hobbiesNotes || '');

    let inferencia = `El usuario pregunta sobre "mañana" a las ${hora} AM. Esto es ambiguo. `;
    inferencia += `La "mañana" inmediata es ${formatearFecha(hoy)}, que es un día ${esLaboralHoy ? 'laboral' : 'de descanso'}. `;
    inferencia += `El día siguiente completo es ${formatearFecha(manana)}, que es un día ${esLaboralManana ? 'laboral' : 'de descanso'}.`;
    
    return inferencia;
  }

  return null;
}

/**
 * Helper para detectar si el texto del usuario contiene temas o palabras clave sensibles.
 */
function analizarSensibilidad(input: UserInput, context: CentinelaContext): string | null {
    const texto = input.rawText.toLowerCase();
    const triggersSensibles = new Set([
        "vulnerable", "frágil", "peligro", "riesgo", "suicidio", "daño", "danger", "harm", "fragile"
    ]);

    const triggerDetectado = [...triggersSensibles].find(trigger => texto.includes(trigger));

    if (triggerDetectado) {
        // En lugar de devolver una respuesta, instruimos a la IA sobre cómo debe actuar.
        let inferencia = `El texto del usuario contiene el término sensible "${triggerDetectado}". `;
        inferencia += `Debes manejar la conversación con extremo cuidado y empatía. Ofrece apoyo y, si es apropiado, sugiere contactar a alguien de confianza o a un profesional. No continúes con la conversación normal hasta que se resuelva este punto.`;
        return inferencia;
    }

    return null;
}


/**
 * Utilidades de formato y lógica de fechas.
 */
function esDiaLaboral(date: Date, holidaysStr: string): boolean {
  const day = date.getDay(); // 0 = Domingo, 6 = Sábado
  if (day === 0 || day === 6) return false;

  const isoDate = date.toISOString().split('T')[0];
  const holidays = holidaysStr.split(',').map(d => d.trim());
  
  return !holidays.includes(isoDate);
}

function formatearFecha(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
