const fs = require('fs');
const appTsxPath = './App.tsx';
const { execSync } = require('child_process');

console.log(' Instalando dependencias de navegación faltantes...');
try {
  execSync('npm install @react-navigation/stack @react-native-masked-view/masked-view', { stdio: 'inherit' });
  console.log('✅ Dependencias instaladas correctamente');
} catch (error) {
  console.error(' Error al instalar dependencias:', error.message);
}

// Verificar y corregir RootNavigator.tsx
const rootNavigatorPath = './src/navigation/RootNavigator.tsx';
if (fs.existsSync(rootNavigatorPath)) {
  let content = fs.readFileSync(rootNavigatorPath, 'utf8');
  
  // Asegurarse de que la importación sea correcta
  if (content.includes("import { createStackNavigator }")) {
    console.log(' Importación de Stack Navigator parece correcta');
  } else {
    // Corregir la importación
    content = content.replace(
      "import { NavigationContainer } from '@react-navigation/native';",
      "import { NavigationContainer } from '@react-navigation/native';\nimport { createStackNavigator } from '@react-navigation/stack';"
    );
    
    fs.writeFileSync(rootNavigatorPath, content);
    console.log('Corregida la importación en RootNavigator.tsx');
  }
} else {
  console.log(' No se encontró RootNavigator.tsx, creando archivo...');
  
  // Crear directorio si no existe
  if (!fs.existsSync('./src/navigation')) {
    fs.mkdirSync('./src/navigation', { recursive: true });
  }
  
  // Crear un RootNavigator básico
  const basicRootNavigator = `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import AppNavigator from './AppNavigator';
import AuthScreen from '../screens/AuthScreen';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // O un componente de carga
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;`;

  fs.writeFileSync(rootNavigatorPath, basicRootNavigator);
  console.log(' Creado RootNavigator.tsx básico');
}

// Verificar App.tsx
// console.log('\n Correcciones completadas. Ahora ejecuta:');
// console.log('npx expo start --clear');

// La siguiente línea 76 es la que causa el error de redeclaración.
// Comentarla debería solucionar el TS2451.
// const appTsxPath = './App.tsx'; 
// Si esta variable es necesaria más adelante en el script, se debería revisar la lógica
// para usar la primera declaración de appTsxPath de la línea 2.
// Por ahora, la comentamos para resolver el error de TypeScript.

// ... el resto del archivo si existe ...
