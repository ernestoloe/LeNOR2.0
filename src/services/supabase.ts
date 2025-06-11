import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// SecureStore adapter for Supabase Auth
const ExpoSecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('ExpoSecureStoreAdapter.getItem Error:', error);
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('ExpoSecureStoreAdapter.setItem Error:', error);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('ExpoSecureStoreAdapter.removeItem Error:', error);
    }
  },
};

// Initialize Supabase client
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// User types
export interface UserPreferences {
  empathetic: boolean;
  confrontational: boolean;
  detailed: boolean;
  concise: boolean;
  creative: boolean;
  logical: boolean;
  nicknameForLenor?: string | null;
  workScheduleNotes?: string | null;
  hobbiesNotes?: string | null;
  relationshipsNotes?: string | null;
}

export interface User {
  id: string;
  email: string;
  preferences?: UserPreferences;
  zep_session_id?: string | null;
}

// Auth functions
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  
  // Initialize user preferences in database if signup successful
  if (data?.user) {
    await initializeUserPreferences(data.user.id);
  }
  
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }
  
  return {
    id: session.user.id,
    email: session.user.email || '',
  };
};

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
      return ''; // No hay notas para eliminar
    }

    // Asumimos que las notas están separadas por "\n- " y la primera no tiene el prefijo.
    // Para normalizar, añadimos el prefijo si no está y luego dividimos.
    // O, más simple, dividimos por "\n" y luego filtramos las que empiezan con "- " y la nota misma.
    const notesArray = currentNotes.split('\n').map((note: string) => note.startsWith('- ') ? note.substring(2) : note).filter(Boolean);
    
    const updatedNotesArray = notesArray.filter((note: string) => note.trim() !== noteToDelete.trim());

    // Reconstruir el string, asegurando el formato "- " para cada nota si hay más de una, o solo la nota si es la única.
    let updatedNotesString = '';
    if (updatedNotesArray.length > 0) {
      if (updatedNotesArray.length === 1) {
        updatedNotesString = updatedNotesArray[0];
      } else {
        updatedNotesString = updatedNotesArray.map((note: string) => `- ${note}`).join('\n');
      }
    }
    
    // Si la primera nota originalmente no tenía "- ", y ahora es la única, no debería tenerlo.
    // Sin embargo, el método de añadir siempre pone "- " si ya hay notas.
    // Para consistencia, si queda solo una nota, la dejamos sin el "- ". Si quedan múltiples, todas con "- ".
    // La lógica actual de addExplicitMemoryNote añade `\n- ${newNote}`.trim()
    // Esto significa que la primera nota no tendrá "- ". Las siguientes sí.
    // Al reconstruir: si hay una sola nota, no ponerle prefijo.
    // Si hay varias, la primera sin prefijo, las demás con "\n- ".

    if (updatedNotesArray.length > 0) {
      updatedNotesString = updatedNotesArray[0];
      for (let i = 1; i < updatedNotesArray.length; i++) {
        updatedNotesString += `\n- ${updatedNotesArray[i]}`;
      }
    } else {
      updatedNotesString = ''; // Todas las notas fueron eliminadas o la nota a eliminar era la única
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

// Function to upload image to Supabase Storage
export const uploadImage = async (uri: string): Promise<string> => {
  try {
    // Convert URI to Blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create a unique file name
    const fileExt = uri.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to Supabase Storage bucket 'image-uploads'
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: _data, error } = await supabase.storage
      .from('image-uploads') // Use the exact bucket name you created
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: blob.type, // Pass content type
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error('Error al subir la imagen a Supabase Storage.');
    }

    // Get the public URL
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
