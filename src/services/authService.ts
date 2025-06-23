import { supabase } from './supabaseClient';
import { initializeUserPreferences } from './userProfileService';
import { User } from '../types/user';

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