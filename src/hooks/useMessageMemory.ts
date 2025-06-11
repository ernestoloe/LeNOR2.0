// src/hooks/useMessageMemory.ts
import { supabase } from '../services/supabase';
// Eliminar la importación de generateEmbedding, ya no se usa
// import { generateEmbedding } from '../services/embeddingService';

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Carga el historial de mensajes de una sesión
 */
export const loadMessages = async (
  user_id: string,
  limit: number = 50 // Aumentar límite por defecto a 50 para más contexto conversacional
): Promise<ChatMsg[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content') // Seleccionar solo role y content
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('loadMessages error:', error);
    return [];
  }
  // Asegurarse que el mapeo es correcto
  if (!data) {
    return []; // Si no hay datos, devolver array vacío
  }
  // TypeScript debería inferir 'data' como ChatMsg[] aquí si la consulta es correcta
  return data.map(row => ({
    role: row.role,
    content: row.content,
  })).reverse(); // Revertir aquí para que queden en orden cronológico
};

/**
 * Guarda un mensaje nuevo en la sesión (tabla 'messages' solamente)
 */
export const saveMessage = async (
  user_id: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> => {
  // Guardar solo el mensaje original en la tabla 'messages'
  const { error } = await supabase
    .from('messages')
    .insert({ user_id, role, content });

  if (error) {
    console.error('saveMessage (messages) error:', error);
  }
  // Eliminar toda la lógica relacionada con embeddings
};
