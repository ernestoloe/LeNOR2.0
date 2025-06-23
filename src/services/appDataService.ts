import { FamilyMember } from '../types/user';
import { supabase } from './supabaseClient';
import { Announcement } from '../types/app';

/**
 * Busca un miembro de la familia en la base de datos por su email.
 * @param userEmail El email del usuario a buscar.
 * @returns El perfil del miembro de la familia o null si no se encuentra.
 */
export const getFamilyMemberByEmailFromDB = async (
  userEmail: string
): Promise<FamilyMember | null> => {
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (error) {
      // 'PGRST116' es el código para "No rows found"
      if (error.code !== 'PGRST116') {
        console.error('Error al buscar miembro de la familia en Supabase:', error);
      }
      return null;
    }

    if (data) {
        // El mapeo de Supabase a la interfaz de la aplicación
        return {
            email: data.email,
            name: data.name,
            aliases: data.aliases || [],
            familyContext: data.family_context,
            preferences: data.preferences || [],
            devModeCode: data.dev_mode_code,
            isMinorRequiringAdult: data.is_minor_requiring_adult
        };
    }

    return null;
  } catch (err) {
    console.error('Error inesperado en getFamilyMemberByEmailFromDB:', err);
    return null;
  }
};

/**
 * Obtiene todos los anuncios activos de la base de datos.
 * @returns Una lista de anuncios activos.
 */
export const getActiveAnnouncementsFromDB = async () => {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('title, content, created_at')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al obtener anuncios de Supabase:', error);
            return [];
        }

        return data;
    } catch (err) {
        console.error('Error inesperado en getActiveAnnouncementsFromDB:', err);
        return [];
    }
} 