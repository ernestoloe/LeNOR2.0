import { supabase } from './supabaseClient';
import { UserPreferences } from '../types/user';

// User preferences functions
export const initializeUserPreferences = async (userId: string) => {
  const zepSessionId = userId;
  
  const defaultUserPreferences: UserPreferences = {
    empathetic: false,
    confrontational: false,
    detailed: false,
    concise: false,
    creative: false,
    logical: false,
    nicknameForLenor: '',
    workScheduleNotes: '',
    hobbiesNotes: '',
    relationshipsNotes: '',
    voice_locale: 'es-MX',
  };
  
  const { error } = await supabase
    .from('user_preferences')
    .insert([
      { 
        user_id: userId,
        preferences: defaultUserPreferences,
        explicit_memory_notes: '',
        zep_session_id: zepSessionId
      },
    ]);
    
  if (error) {
    console.error('Error initializing user preferences/notes/zep_session:', error);
    if (error.code === '23505') {
      console.warn(`Preferences/session for user ${userId} likely already exist. Attempting update with default structure.`);
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update({
            preferences: defaultUserPreferences,
        })
        .eq('user_id', userId);
       if (updateError) {
           console.error('Error updating existing user preferences structure:', updateError);
           throw updateError;
       }
       console.log(`Successfully updated preferences structure for existing user ${userId}.`);
    } else {
        throw error;
    }
  }
};

export const getUserPreferencesAndNotes = async (userId: string): Promise<{
  preferences: UserPreferences | null;
  explicit_memory_notes: string | null;
  zep_session_id: string | null;
} | null> => {
  let { data, error } = await supabase
    .from('user_preferences')
    .select('preferences, explicit_memory_notes, zep_session_id')
    .eq('user_id', userId)
    .single();
    
  if (error && error.code === 'PGRST116') { // No row found
       console.warn(`Preferences/session not found for user ${userId}. Initializing now.`);
       try {
         await initializeUserPreferences(userId);
      const refetchResult = await supabase
           .from('user_preferences')
           .select('preferences, explicit_memory_notes, zep_session_id')
           .eq('user_id', userId)
           .single();
      data = refetchResult.data;
      error = refetchResult.error; 

      if (error) { 
        console.error('Error getting user data AFTER fresh initialization:', error);
            return null;
         }
       } catch (initError) {
      console.error('Error during initializeUserPreferences call or re-fetch:', initError);
      return null;
    }
  } else if (error) { 
    console.error('Error getting user data (initial fetch):', error);
         return null;
       }

  if (!data) {
    console.error(`No preference data ultimately found for user ${userId}.`);
       return null;
     }
  
  const currentPrefs = (data.preferences || {}) as Partial<UserPreferences>;
  const ensureDefaults = (prefs: Partial<UserPreferences>): UserPreferences => ({
    empathetic: prefs.empathetic || false,
    confrontational: prefs.confrontational || false,
    detailed: prefs.detailed || false,
    concise: prefs.concise || false,
    creative: prefs.creative || false,
    logical: prefs.logical || false,
    nicknameForLenor: prefs.nicknameForLenor || '',
    workScheduleNotes: prefs.workScheduleNotes || '',
    hobbiesNotes: prefs.hobbiesNotes || '',
    relationshipsNotes: prefs.relationshipsNotes || '',
    voice_locale: prefs.voice_locale || 'es-MX',
  });

  const finalPreferences = ensureDefaults(currentPrefs);

  if (data.zep_session_id === null || data.zep_session_id === undefined || data.zep_session_id === '') {
    console.warn(`User ${userId} has preferences row but zep_session_id is missing. Updating now.`);
    try {
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update({ zep_session_id: userId }) 
        .eq('user_id', userId);
      
      if (updateError) {
        console.error(`Error updating missing zep_session_id for user ${userId}:`, updateError);
      } else {
        console.log(`Successfully updated missing zep_session_id for user ${userId} in DB.`);
        data.zep_session_id = userId; 
      }
    } catch (catchUpdateError) {
        console.error(`Exception while updating missing zep_session_id for user ${userId}:`, catchUpdateError);
    }
  }

   return {
    preferences: finalPreferences,
    explicit_memory_notes: data.explicit_memory_notes as string | null,
    zep_session_id: data.zep_session_id as string | null
   };
};

export const addExplicitMemoryNote = async (userId: string, newNote: string): Promise<string | null> => {
  try {
    const { data: currentData, error: fetchError } = await supabase
      .from('user_preferences')
      .select('explicit_memory_notes')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching current memory notes:', fetchError);
      return null;
    }

    const currentNotes = currentData?.explicit_memory_notes || '';
    const updatedNotes = `${currentNotes}\n- ${newNote}`.trim();

    const { error: updateError } = await supabase
      .from('user_preferences')
      .update({ explicit_memory_notes: updatedNotes })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating memory notes:', updateError);
      return null;
    }
    
    return updatedNotes;

  } catch (error) {
     console.error('Unexpected error in addExplicitMemoryNote:', error);
     return null;
  }
};

export const deleteExplicitMemoryNote = async (userId: string, noteToDelete: string): Promise<string | null> => {
  try {
    const { data: currentData, error: fetchError } = await supabase
      .from('user_preferences')
      .select('explicit_memory_notes')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching current memory notes for deletion:', fetchError);
      return null;
    }

    const currentNotes = currentData?.explicit_memory_notes || '';
    if (!currentNotes.trim()) {
      return '';
    }

    const notesArray = currentNotes.split('\n').map((note: string) => note.startsWith('- ') ? note.substring(2) : note).filter(Boolean);
    
    const updatedNotesArray = notesArray.filter((note: string) => note.trim() !== noteToDelete.trim());

    let updatedNotesString = '';
    if (updatedNotesArray.length > 0) {
      updatedNotesString = updatedNotesArray[0];
      for (let i = 1; i < updatedNotesArray.length; i++) {
        updatedNotesString += `\n- ${updatedNotesArray[i]}`;
      }
    } else {
      updatedNotesString = '';
    }


    const { error: updateError } = await supabase
      .from('user_preferences')
      .update({ explicit_memory_notes: updatedNotesString })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating memory notes after deletion:', updateError);
      return null;
    }
    
    return updatedNotesString;

  } catch (error) {
     console.error('Unexpected error in deleteExplicitMemoryNote:', error);
     return null;
  }
};

export const updateUserPreferences = async (userId: string, newPreferences: UserPreferences) => {
  const { data, error } = await supabase
     .from('user_preferences')
    .update({ preferences: newPreferences })
    .eq('user_id', userId)
    .select();

   if (error) {
    console.error('Error updating user preferences:', error);
       throw error;
   }
  return data; 
 };

export const uploadImage = async (uri: string): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    const fileExt = uri.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from('image-uploads')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: blob.type,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error('Error al subir la imagen a Supabase Storage.');
    }

    const { data: publicUrlData } = supabase.storage
      .from('image-uploads')
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('No se pudo obtener la URL pública de la imagen.');
    }

    console.log('Image uploaded successfully. Public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw error;
  }
}; 