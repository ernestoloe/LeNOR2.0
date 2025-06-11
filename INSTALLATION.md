# Guía de Instalación y Uso - Soy ELOE

Este documento proporciona instrucciones paso a paso para instalar, configurar y utilizar la aplicación "Soy ELOE".

## Instalación

### Requisitos Previos

1. **Node.js y npm**
   - Instala Node.js (versión 16 o superior) desde [nodejs.org](https://nodejs.org/)
   - npm se instala automáticamente con Node.js

2. **Expo CLI**
   ```bash
   npm install -g expo-cli
   ```

3. **Cuentas en servicios externos**
   - [Supabase](https://supabase.com/): Para autenticación y almacenamiento
   - [OpenRouter](https://openrouter.ai/): Para acceso a Google Gemini 2.0 Pro Lite
   - [ElevenLabs](https://elevenlabs.io/): Para síntesis de voz

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd soy-eloe
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   - Copia el archivo `.env.example` a `.env`
   - Completa las variables con tus propias API keys:
     ```
     # Supabase Configuration
     SUPABASE_URL=your_supabase_url
     SUPABASE_KEY=your_supabase_key

     # OpenRouter Configuration
     OPENROUTER_API_KEY=your_openrouter_api_key
     OPENROUTER_MODEL=google/gemini-pro-2.0

     # ElevenLabs Configuration
     ELEVENLABS_API_KEY=your_elevenlabs_api_key
     ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id

     # AI Configuration
     AI_TEMPERATURE=0.68
     AI_MAX_TOKENS=8000
     ```

4. **Configurar Supabase**
   - Crea un nuevo proyecto en Supabase
   - En el SQL Editor, ejecuta el siguiente script:
     ```sql
     CREATE TABLE user_preferences (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID REFERENCES auth.users(id) NOT NULL,
       preferences JSONB NOT NULL DEFAULT '{}',
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
     );
     ```
   - Habilita la autenticación por email en Authentication > Providers

## Ejecución

### Desarrollo Local

1. **Iniciar el servidor de desarrollo**
   ```bash
   npx expo start
   ```

2. **Ejecutar en dispositivo o emulador**
   - Escanea el código QR con la app Expo Go (Android) o la cámara (iOS)
   - O presiona 'a' para Android o 'i' para iOS en la terminal

### Compilación con EAS Build

1. **Configurar EAS CLI**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Configurar el proyecto**
   ```bash
   eas build:configure
   ```

3. **Compilar para iOS (sin necesidad de Mac)**
   ```bash
   eas build --platform ios --profile preview
   ```

4. **Compilar para Android**
   ```bash
   eas build --platform android --profile preview
   ```

## Uso de la Aplicación

### Registro e Inicio de Sesión

1. Al abrir la aplicación por primera vez, serás dirigido a la pantalla de inicio de sesión
2. Selecciona "Registrarse" para crear una nueva cuenta
3. Ingresa tu email y contraseña
4. Una vez registrado, serás redirigido automáticamente a la pantalla principal

### Pantalla de Chat

1. Esta es la pantalla principal donde puedes interactuar con ELOE
2. Escribe tu mensaje en el campo de texto inferior
3. Presiona "Enviar" para enviar tu mensaje
4. Observa cómo ELOE responde con el efecto de typing

### Modo de Voz

1. Navega a la pestaña "Voice" en la barra inferior
2. Presiona el botón del micrófono para comenzar a hablar
3. Habla claramente y presiona nuevamente para detener la grabación
4. ELOE procesará tu mensaje y responderá con voz
5. Presiona "Salir del Modo de Voz" para volver al chat y ver la conversación

### Perfil

1. Navega a la pestaña "Profile" en la barra inferior
2. Responde a las preguntas de Sí/No para personalizar cómo ELOE interactúa contigo
3. Presiona "Guardar Preferencias" para almacenar tus preferencias

### Configuración

1. Navega a la pestaña "Settings" en la barra inferior
2. Aquí puedes ver tu información de usuario
3. Presiona "Cerrar Sesión" para salir de tu cuenta

## Solución de Problemas

### Problemas de Conexión

- Verifica tu conexión a internet
- Asegúrate de que las API keys en el archivo `.env` sean correctas
- Comprueba que los servicios externos (Supabase, OpenRouter, ElevenLabs) estén funcionando

### Problemas con el Reconocimiento de Voz

- Asegúrate de haber concedido permisos de micrófono a la aplicación
- Habla claramente y en un ambiente con poco ruido
- Si el problema persiste, intenta reiniciar la aplicación

### Problemas con la Síntesis de Voz

- Verifica que tu API key de ElevenLabs sea válida
- Asegúrate de que el ID de voz especificado exista en tu cuenta
- Comprueba el volumen de tu dispositivo

## Contacto y Soporte

Si encuentras algún problema o tienes alguna pregunta, no dudes en contactarnos:

- Email: [tu-email@ejemplo.com]
- GitHub: [enlace-a-tu-repositorio]
## Variables de entorno (archivo `.env`)

```env
# Supabase
SUPABASE_URL=tu_url
SUPABASE_KEY=tu_key

# OpenRouter
OPENROUTER_API_KEY=tu_key
OPENROUTER_MODEL=google/gemini-pro-2.0

# ElevenLabs (opcional, expo-speech si no está)
ELEVENLABS_API_KEY=tu_key
ELEVENLABS_VOICE_ID=tu_voice_id

# IA genéricas
AI_TEMPERATURE=0.68
AI_MAX_TOKENS=8000
```
