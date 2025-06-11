// import { ZepClient } from "@getzep/zep-js"; // Comentado o eliminado
// import { SupabaseClient } from "@supabase/supabase-js"; // Comentado o eliminado
import { networkService } from "./networkService";
import { zepClient } from "./zepService"; // Asumiendo que zepClient se exporta desde zepService
import { supabase } from "./supabase"; // Asumiendo que supabase se exporta
import { logError } from "./loggingService";

// Estados posibles para los servicios
type ServiceStatus = "OK" | "ERROR" | "DEGRADADO" | "NO_DISPONIBLE" | "DESCONECTADO" | "CONECTADO" | "NO_ACTIVA" | "ACTIVA_OK";

interface ZepError {
  response?: {
    status?: number;
    data?: unknown; // Podrías ser más específico si conoces la estructura de data
  };
  message?: string;
}

/**
 * Verifica el estado de la conexión de red.
 */
const checkNetworkStatus = (): ServiceStatus => {
  try {
    return networkService.getCurrentStatus() ? "CONECTADO" : "DESCONECTADO";
  } catch (error) {
    logError(error, "CortexService_checkNetworkStatus");
    return "ERROR";
  }
};

/**
 * Verifica el estado de Zep.
 * Intenta una operación ligera, como obtener la memoria de la sesión (incluso si está vacía).
 */
const checkZepStatus = async (sessionId: string | null): Promise<ServiceStatus> => {
  if (!sessionId) {
    return "NO_DISPONIBLE"; // No hay sesión para verificar
  }
  if (!zepClient) {
    console.warn(">>> CortexService: ZepClient no está disponible en zepService.");
    return "NO_DISPONIBLE";
  }

  try {
    // Intentar obtener la memoria. Una sesión nueva devolverá un 404 que el SDK maneja
    // o una respuesta con mensajes vacíos, lo cual es "OK" para un chequeo de disponibilidad.
    await zepClient.memory.get(sessionId);
    return "OK";
  } catch (error: unknown) {
    const zepError = error as ZepError;
    logError(zepError, `CortexService_checkZepStatus (Session: ${sessionId.substring(0,8)})`);
    // El SDK de Zep puede lanzar errores con una propiedad 'response'
    if (zepError.response && zepError.response.status === 404) {
      // Un 404 significa que la sesión no existe en Zep aún, lo cual es un estado válido,
      // pero para el chequeo de "servicio arriba", lo consideramos OK ya que Zep respondió.
      // O podríamos tener un estado específico como "SESION_NUEVA"
      return "OK"; 
    }
    // Otros errores pueden indicar problemas con el servicio de Zep
    return "ERROR"; 
  }
};

/**
 * Verifica el estado de Supabase.
 * Intenta una operación ligera, como obtener la sesión actual.
 */
const checkSupabaseStatus = async (): Promise<ServiceStatus> => {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      // No necesariamente un error crítico del servicio, podría ser un token expirado, etc.
      // pero para un chequeo simple, lo marcamos como degradado.
      logError(error, "CortexService_checkSupabaseStatus_getSessionError");
      return "DEGRADADO"; 
    }
    return "OK";
  } catch (error) {
    logError(error, "CortexService_checkSupabaseStatus_catch");
    return "ERROR"; // Error más fundamental al intentar comunicarse con Supabase
  }
};

/**
 * Recopila y formatea los estados de los servicios críticos.
 * @param zepSessionId El ID de sesión actual de Zep.
 * @returns Una cadena formateada con el estado de los sistemas.
 */
export const getCortexStatus = async (zepSessionId: string | null): Promise<string> => {
  const network = checkNetworkStatus();
  const zep = await checkZepStatus(zepSessionId);
  const supa = await checkSupabaseStatus();

  // Formatear la cadena para la IA.
  // Ser conciso pero claro.
  let zepStatusText = zep;
  if (zep === "OK" && !zepSessionId) {
      zepStatusText = "NO_ACTIVA"; // Si Zep está OK pero no hay sesión activa en la app.
  } else if (zep === "OK" && zepSessionId) {
      zepStatusText = "ACTIVA_OK";
  }


  return `ESTADO_SISTEMA: Red: ${network}, MemoriaLargoPlazo(Zep): ${zepStatusText}, BaseDatos(Supabase): ${supa}`;
}; 

/**
 * Recopila y devuelve un objeto con los estados de los servicios críticos.
 * @param zepSessionId El ID de sesión actual de Zep.
 * @returns Un objeto con el estado de los sistemas.
 */
export const getSystemStatusObject = async (zepSessionId: string | null): Promise<{
  network: ServiceStatus;
  zep: ServiceStatus;
  zepFriendly: string;
  supabase: ServiceStatus;
}> => {
  const network = checkNetworkStatus();
  const zep = await checkZepStatus(zepSessionId);
  const supabaseStatus = await checkSupabaseStatus();

  let zepFriendlyText = zep;
  if (zep === "OK" && !zepSessionId) {
    zepFriendlyText = "NO_ACTIVA";
  } else if (zep === "OK" && zepSessionId) {
    zepFriendlyText = "ACTIVA_OK";
  }

  return {
    network,
    zep,
    zepFriendly: zepFriendlyText,
    supabase: supabaseStatus,
  };
}; 