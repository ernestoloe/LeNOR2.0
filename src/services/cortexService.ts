// import { ZepClient } from "@getzep/zep-js"; // Comentado o eliminado
// import { SupabaseClient } from "@supabase/supabase-js"; // Comentado o eliminado
import { networkService } from "./networkService";
import { zepClient } from "./zepService"; // Asumiendo que zepClient se exporta desde zepService
import { supabase } from "./supabaseClient"; // Asumiendo que supabase se exporta

// Estados posibles para los servicios
type ServiceStatus = "OK" | "ERROR" | "DEGRADADO" | "NO_DISPONIBLE" | "DESCONECTADO" | "CONECTADO" | "NO_ACTIVA" | "ACTIVA_OK" | "TIMEOUT";

interface ZepError {
  response?: {
    status?: number;
    data?: unknown; // Podrías ser más específico si conoces la estructura de data
  };
  message?: string;
}

/**
 * Función helper para crear timeouts en promesas
 */
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    )
  ]);
};

/**
 * Verifica el estado de la conexión de red.
 */
const checkNetworkStatus = (): ServiceStatus => {
  try {
    return networkService.getCurrentStatus() ? "CONECTADO" : "DESCONECTADO";
  } catch (error) {
    console.error("Error en CortexService_checkNetworkStatus:", error);
    return "ERROR";
  }
};

/**
 * Verifica el estado de Zep con timeout.
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
    // Timeout de 5 segundos para evitar carga infinita
    await withTimeout(zepClient.memory.get(sessionId), 5000);
    return "OK";
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'TIMEOUT') {
      console.warn(`>>> CortexService: Timeout verificando Zep (Session: ${sessionId ? sessionId.substring(0,8) : 'N/A'})`);
      return "TIMEOUT";
    }
    
    const zepError = error as ZepError;
    console.error(`Error en CortexService_checkZepStatus (Session: ${sessionId ? sessionId.substring(0,8) : 'N/A'}):`, zepError);
    
    // El SDK de Zep puede lanzar errores con una propiedad 'response'
    if (zepError.response && zepError.response.status === 404) {
      // Un 404 significa que la sesión no existe en Zep aún, lo cual es un estado válido,
      // pero para el chequeo de "servicio arriba", lo consideramos OK ya que Zep respondió.
      return "OK"; 
    }
    // Otros errores pueden indicar problemas con el servicio de Zep
    return "ERROR"; 
  }
};

/**
 * Verifica el estado de Supabase con timeout.
 * Intenta una operación ligera, como obtener la sesión actual.
 */
const checkSupabaseStatus = async (): Promise<ServiceStatus> => {
  try {
    // Timeout de 3 segundos para evitar carga infinita
    const { error } = await withTimeout(supabase.auth.getSession(), 3000);
    
    if (error) {
      // No necesariamente un error crítico del servicio, podría ser un token expirado, etc.
      // pero para un chequeo simple, lo marcamos como degradado.
      console.error("Error en CortexService_checkSupabaseStatus_getSessionError:", error);
      return "DEGRADADO"; 
    }
    return "OK";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'TIMEOUT') {
      console.warn(">>> CortexService: Timeout verificando Supabase");
      return "TIMEOUT";
    }
    
    console.error("Error en CortexService_checkSupabaseStatus_catch:", error);
    return "ERROR"; // Error más fundamental al intentar comunicarse con Supabase
  }
};

/**
 * Recopila y formatea los estados de los servicios críticos.
 * @param zepSessionId El ID de sesión actual de Zep.
 * @returns Una cadena formateada con el estado de los sistemas.
 */
export const getCortexStatus = async (zepSessionId: string | null): Promise<string> => {
  try {
    // Timeout global de 10 segundos para toda la operación
    const result = await withTimeout(
      (async () => {
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
      })(),
      10000
    );
    
    return result;
  } catch (error) {
    console.error(">>> CortexService: Error obteniendo estado del sistema:", error);
    return "ESTADO_SISTEMA: Red: ERROR, MemoriaLargoPlazo(Zep): ERROR, BaseDatos(Supabase): ERROR";
  }
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
  try {
    console.log(">>> CortexService: Iniciando diagnóstico del sistema...");
    
    // Timeout global de 8 segundos para evitar carga infinita
    const result = await withTimeout(
      (async () => {
        // Ejecutar todas las comprobaciones en paralelo para mayor eficiencia
        const [network, zep, supabaseStatus] = await Promise.all([
          Promise.resolve(checkNetworkStatus()), // Esta es síncrona, pero se puede incluir en Promise.all
          checkZepStatus(zepSessionId),
          checkSupabaseStatus(),
        ]);

        let zepFriendlyText: ServiceStatus | string = zep;
        if (zep === "OK") {
          zepFriendlyText = zepSessionId ? "ACTIVA_OK" : "NO_ACTIVA";
        } else if (zep === "TIMEOUT") {
          zepFriendlyText = "TIMEOUT - Reinicia la app";
        }

        console.log(">>> CortexService: Diagnóstico completado exitosamente");
        
        return {
          network,
          zep,
          zepFriendly: zepFriendlyText,
          supabase: supabaseStatus,
        };
      })(),
      8000
    );
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'TIMEOUT') {
      console.warn(">>> CortexService: Timeout global en diagnóstico del sistema");
      return {
        network: "TIMEOUT",
        zep: "TIMEOUT",
        zepFriendly: "TIMEOUT - Reinicia la app",
        supabase: "TIMEOUT",
      };
    }
    
    console.error(">>> CortexService: Error crítico en diagnóstico del sistema:", error);
    return {
      network: "ERROR",
      zep: "ERROR",
      zepFriendly: "ERROR - Verifica conexión",
      supabase: "ERROR",
    };
  }
}; 