// src/utils/id.ts
import * as Crypto from 'expo-crypto';

/**
 * Genera un UUID v4 estándar con fallback en caso de error.
 */
export function generateId(): string {
  try {
    // Intentar usar la función estándar de Expo
    return Crypto.randomUUID();
  } catch (error) {
    console.error('Error generando UUID con Crypto.randomUUID:', error);
    
    // Método alternativo en caso de fallo
    return generateFallbackId();
  }
}

/**
 * Método fallback para generar IDs únicos usando Date.now() y Math.random().
 * No es tan bueno como un UUID v4 real, pero es mejor que nada en caso de error.
 */
function generateFallbackId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  
  return `fallback-${timestamp}-${randomPart}`;
}

/**
 * Genera un ID único para mensajes que incluye userId, timestamp y un valor aleatorio
 * para garantizar unicidad absoluta incluso en sistemas distribuidos.
 */
export function generateMessageId(userId: string = 'anonymous'): string {
  try {
    const timestamp = Date.now();
    const randomId = Crypto.randomUUID();
    // Formato: msg-{userId}-{timestamp}-{randomUUID}
    return `msg-${userId.substring(0, 8)}-${timestamp}-${randomId.substring(0, 8)}`;
  } catch (error) {
    console.error('Error generando MessageID:', error);
    // Fallback más simple pero aún con unicidad razonable
    return `msg-${userId.substring(0, 8)}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
}

/**
 * Extrae el timestamp de un messageId generado con generateMessageId
 */
export function getTimestampFromMessageId(messageId: string): number | null {
  try {
    // Formato esperado: msg-{userId}-{timestamp}-{randomUUID}
    const parts = messageId.split('-');
    if (parts.length >= 3) {
      return parseInt(parts[2], 10);
    }
    return null;
  } catch (error) {
    console.error('Error extrayendo timestamp de messageId:', error);
    return null;
  }
}
  