import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { setJSExceptionHandler, setNativeExceptionHandler } from 'react-native-exception-handler';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation';
import { AppThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { useFonts, Roboto_400Regular, Roboto_700Bold, Roboto_500Medium } from '@expo-google-fonts/roboto';
import * as SplashScreen from 'expo-splash-screen';
import { messageStore } from './src/services/messageStore';
import { networkService } from './src/services/networkService';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { GlobalErrorBoundary } from './src/components';

ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error("GLOBAL JS ERROR:", error, isFatal);
  // Aquí puedes añadir lógica para enviar el error a un servicio de logging
  // o mostrar una alerta al usuario.
  Alert.alert(
    'Error Crítico',
    `Ha ocurrido un error inesperado. Por favor, reinicia la aplicación.\n\n${error.message}`,
    [{ text: 'Ok' }]
  );
});

setJSExceptionHandler((error, isFatal) => {
  console.log('Caught JS Exception: ', error, isFatal);
  Alert.alert(
    'Error Inesperado',
    `Ha ocurrido un error:\n\n${error.name}: ${error.message}\n\nRecomendamos reiniciar la aplicación.`,
    [{ text: 'Ok' }]
  );
}, true);

setNativeExceptionHandler((exceptionString) => {
  console.log('Caught Native Exception: ', exceptionString);
  Alert.alert(
    'Error Inesperado',
    `Ha ocurrido un error:\n\n${exceptionString}\n\nRecomendamos reiniciar la aplicación.`,
    [{ text: 'Ok' }]
  );
});

// Mantener la pantalla de splash visible mientras cargamos recursos
SplashScreen.preventAutoHideAsync();

/**
 * Initializes app-wide services that need to be started once.
 */
const initializeServices = async () => {
  try {
    console.log('>>> App.tsx: Initializing services...');
    networkService.initialize();
    messageStore.initialize();
    console.log('>>> App.tsx: Services initialized.');
  } catch (error) {
    console.error('Error initializing services:', error);
  }
};

const AppContent = () => {
  const { isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    initializeServices();
  }, []);

  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
    Roboto_500Medium,
  });

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || isAuthLoading) {
    return null;
  }

  return (
    <RootNavigator />
  );
};

const App = () => {
  return (
    <GlobalErrorBoundary>
      <AppThemeProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <AppContent />
        </AuthProvider>
      </AppThemeProvider>
    </GlobalErrorBoundary>
  );
};

export default App;