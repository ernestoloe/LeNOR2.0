// src/hooks/useMessageMemory.ts
import { supabase } from '../src/services/supabase';

export const saveMessage = async (
  user_id: string,
  session_id: string,
  role: 'user' | 'assistant' | 'system',
  content: string
) => {
  const { error } = await supabase.from('messages').insert({
    user_id,
    session_id,
    role,
    content
  });

  if (error) {
    console.error('Error al guardar mensaje:', error.message);
  }
};

export const loadMessages = async (
  user_id: string,
  session_id: string,
  limit: number = 30
) => {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('user_id', user_id)
    .eq('session_id', session_id)
    .order('timestamp', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error al cargar historial:', error.message);
    return [];
  }

  return data || [];
};
