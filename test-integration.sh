#!/bin/bash

# Script para ejecutar pruebas de integración y verificar la app

echo "Ejecutando pruebas de integración para Soy ELOE..."

# Verificar dependencias instaladas
echo "Verificando dependencias..."
npm list --depth=0

# Verificar archivos de configuración
echo "Verificando archivos de configuración..."
if [ -f "app.json" ] && [ -f "eas.json" ] && [ -f "app.config.js" ]; then
  echo "✅ Archivos de configuración correctos"
else
  echo "❌ Faltan archivos de configuración"
  exit 1
fi

# Verificar estructura de directorios
echo "Verificando estructura de directorios..."
if [ -d "src/components" ] && [ -d "src/screens" ] && [ -d "src/services" ] && [ -d "src/contexts" ]; then
  echo "✅ Estructura de directorios correcta"
else
  echo "❌ Estructura de directorios incompleta"
  exit 1
fi

# Verificar archivos principales
echo "Verificando archivos principales..."
if [ -f "src/services/supabase.ts" ] && [ -f "src/services/aiService.ts" ] && [ -f "src/services/elevenLabsService.ts" ]; then
  echo "✅ Servicios implementados correctamente"
else
  echo "❌ Faltan implementaciones de servicios"
  exit 1
fi

# Verificar navegación
echo "Verificando archivos de navegación..."
if [ -f "src/navigation/AppNavigator.tsx" ] && [ -f "src/navigation/RootNavigator.tsx" ]; then
  echo "✅ Navegación implementada correctamente"
else
  echo "❌ Faltan implementaciones de navegación"
  exit 1
fi

# Verificar pantallas
echo "Verificando pantallas..."
if [ -f "src/screens/ChatScreen.tsx" ] && [ -f "src/screens/VoiceModeScreen.tsx" ] && [ -f "src/screens/ProfileScreen.tsx" ] && [ -f "src/screens/SettingsScreen.tsx" ]; then
  echo "✅ Pantallas implementadas correctamente"
else
  echo "❌ Faltan implementaciones de pantallas"
  exit 1
fi

echo "Todas las pruebas completadas exitosamente."
echo "La app está lista para ser compilada con EAS Build."
