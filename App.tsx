import './src/services/networkService';

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation';
import { AppThemeProvider } from './src/contexts/ThemeContext';
import { useFonts, Roboto_400Regular, Roboto_700Bold, Roboto_500Medium } from '@expo-google-fonts/roboto';
import * as SplashScreen from 'expo-splash-screen';
import { messageStore } from './src/services/messageStore';

// Mantener la pantalla de splash visible mientras cargamos recursos
SplashScreen.preventAutoHideAsync();

export default function App() {
  // Inicializar servicios de bajo nivel
  useEffect(() => {
    messageStore.initialize();
  }, []);

  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
    Roboto_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthProvider>
    </AppThemeProvider>
  );
}