# Desarrollo de la App "LéNOR"

## Inicialización y Configuración
- [x] Crear proyecto Expo con TypeScript
- [x] Instalar dependencias para navegación (React Navigation)
- [x] Instalar dependencias para Supabase (autenticación y almacenamiento)
- [x] Instalar dependencias para OpenRouter (integración con IA)
- [x] Instalar dependencias para ElevenLabs (TTS streaming)
- [x] Configurar archivo .env para API keys
- [x] Configurar ESLint y Prettier

## Navegación y Componentes UI
- [x] Implementar Bottom Tabs Navigation
- [x] Crear componentes base con estilo visual requerido
- [x] Implementar tema oscuro con acentos en azul hielo y blanco
- [x] Configurar tipografía moderna (Inter o SF Pro)

## Autenticación con Supabase
- [x] Configurar cliente Supabase
- [x] Implementar pantalla de login/registro
- [x] Implementar lógica de autenticación
- [x] Configurar persistencia de sesión

## Interfaz de Chat
- [x] Crear componente de chat con historial de mensajes
- [x] Implementar efecto de typing para respuestas
- [x] Crear componente de entrada de texto
- [x] Implementar lógica de envío de mensajes a la IA

## Modo de Voz
- [x] Implementar reconocimiento de voz (STT)
- [x] Configurar streaming de audio con ElevenLabs
- [x] Implementar lógica de transición entre Chat y Voice Mode
- [x] Asegurar que la conversación se muestre en Chat al salir de Voice Mode

## Pantallas de Perfil y Configuración
- [x] Crear pantalla de perfil con preguntas de Sí/No
- [x] Implementar almacenamiento de preferencias en Supabase
- [x] Crear pantalla de configuración con datos del usuario
- [x] Implementar funcionalidad de cierre de sesión

## Integración con OpenRouter y IA
- [x] Configurar cliente para OpenRouter
- [x] Crear archivos system.ts y behavior.ts
- [x] Implementar construcción dinámica de prompts
- [x] Integrar preferencias del usuario en los prompts
- [x] Añadir contexto de hora y fecha a los prompts

## Pruebas y Preparación para EAS Build
- [x] Configurar EAS Build
- [x] Realizar pruebas de integración
- [x] Optimizar rendimiento
- [x] Preparar para compilación iOS sin Mac
