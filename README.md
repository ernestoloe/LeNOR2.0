# LéNOR - Aplicación de Asistente IA

## Descripción
LéNOR es una aplicación móvil desarrollada con React Native y Expo que proporciona un asistente de IA personalizado. La aplicación utiliza una mixture of experts y un data set profundo de ELOE, inc. para la inteligencia artificial y ElevenLabs para la síntesis de voz.

## Características Principales

- **Interfaz de Chat**: Conversación con efecto de typing para las respuestas de la IA
- **Modo de Voz**: Interacción por voz con reconocimiento de voz y respuesta hablada
- **Perfil Personalizado**: Configuración de preferencias para adaptar las respuestas de la IA
- **Autenticación**: Sistema completo con Supabase para gestión de usuarios
- **Diseño Elegante**: Tema oscuro con acentos en azul hielo y tipografía moderna

## Tecnologías Utilizadas

- **Frontend**: React Native, TypeScript, Expo
- **Autenticación y Base de Datos**: Supabase
- **IA**: LéNOR 1.5 ELOE, inc y Google Gemini 2.5 Pro (interpretación de fotografías)
- **Síntesis de Voz**: ElevenLabs
- **Compilación**: EAS Build (compatible con iOS sin Mac)

## Requisitos Previos

- Node.js (v16 o superior)
- npm o yarn
- Expo CLI
- Cuenta en Supabase
- Cuenta en OpenRouter
- Cuenta en ElevenLabs

## Configuración del Proyecto

1. **Clonar el repositorio**
   ```
   git clone <https://github.com/ernestoloe/LeNOR>
   cd LeNOR
   ```

2. **Instalar dependencias**
   ```
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:
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
   
   En tu proyecto de Supabase, crea una tabla `user_preferences` con la siguiente estructura:
   ```sql
   CREATE TABLE user_preferences (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users(id) NOT NULL,
     preferences JSONB NOT NULL DEFAULT '{}',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

## Ejecución del Proyecto

### Desarrollo Local

```
npx expo start
```

### Compilación con EAS Build

1. **Configurar EAS CLI**
   ```
   npm install -g eas-cli
   eas login
   ```

2. **Configurar el proyecto en EAS**
   ```
   eas build:configure
   ```

3. **Compilar para iOS (sin necesidad de Mac)**
   ```
   eas build --platform ios --profile preview
   ```

4. **Compilar para Android**
   ```
   eas build --platform android --profile preview
   ```

## Estructura del Proyecto

```
soy-eloe/
├── assets/                  # Imágenes y recursos estáticos
├── src/
│   ├── ai/                  # Configuración de la IA
│   │   ├── behavior.ts      # Reglas de comportamiento para la IA
│   │   └── system.ts        # Instrucciones del sistema para la IA
│   ├── components/          # Componentes reutilizables
│   ├── contexts/            # Contextos de React (Auth, etc.)
│   ├── navigation/          # Configuración de navegación
│   ├── screens/             # Pantallas de la aplicación
│   ├── services/            # Servicios (Supabase, AI, etc.)
│   ├── theme/               # Configuración de tema y estilos
│   ├── types/               # Definiciones de TypeScript
│   └── utils/               # Utilidades y helpers
├── App.tsx                  # Punto de entrada de la aplicación
├── app.json                 # Configuración de Expo
├── eas.json                 # Configuración de EAS Build
└── babel.config.js          # Configuración de Babel
```

## Descripción de Pantallas

La aplicación LéNOR cuenta con varias pantallas diseñadas para ofrecer una experiencia de usuario fluida e intuitiva:

### 1. Pantalla de Autenticación (`AuthScreen.tsx`)
-   **Propósito:** Gestionar el acceso de los usuarios a la aplicación.
-   **Funcionalidades Clave:**
    -   Permite a los usuarios **Iniciar Sesión** con su correo electrónico y contraseña.
    -   Ofrece la opción de **Crear una Cuenta Nueva** (registrarse) si el usuario no tiene una.
    -   Muestra mensajes de error en caso de credenciales incorrectas o problemas durante el registro.
    -   Cambia dinámicamente entre el modo de inicio de sesión y el de registro.

### 2. Pantalla de Chat (`ChatScreen.tsx`)
-   **Propósito:** Es la interfaz principal para la interacción basada en texto con el asistente IA LéNOR.
-   **Funcionalidades Clave:**
    -   Muestra el historial de la conversación actual en formato de burbujas de chat.
    -   Permite al usuario escribir y enviar mensajes de texto.
    -   Permite adjuntar y enviar imágenes (que se suben a Supabase Storage).
    -   Muestra un indicador de "escribiendo..." cuando la IA está generando una respuesta.
    -   Implementa un comando especial (ej. "LéNOR, recuerda que:") para guardar notas en la memoria explícita de la IA.
    -   Ofrece la opción de iniciar una nueva conversación.
    -   Soporta la carga de mensajes más antiguos al hacer scroll hacia arriba (paginación).

### 3. Pantalla de Conversaciones (`ConversationsScreen.tsx`)
-   **Propósito:** Listar todas las conversaciones pasadas del usuario, permitiéndole revisarlas o retomarlas.
-   **Funcionalidades Clave:**
    -   Muestra una lista de todas las conversaciones guardadas del usuario, ordenadas por la más reciente.
    -   Para cada conversación, muestra un fragmento del último mensaje y la fecha/hora.
    -   Permite al usuario seleccionar una conversación para abrirla en la `ChatScreen`.
    -   Ofrece un botón para crear una "Nueva conversación".
    -   Permite eliminar conversaciones individualmente.
    -   Indica cuál es la conversación actualmente activa.

### 4. Pantalla de Modo Voz (`VoiceModeScreen.tsx`)
-   **Propósito:** Permitir una interacción manos libres con LéNOR utilizando comandos de voz y recibiendo respuestas habladas.
-   **Funcionalidades Clave:**
    -   Un botón de micrófono central que el usuario toca para iniciar la escucha.
    -   Utiliza reconocimiento de voz para transcribir lo que el usuario dice.
    -   Envía el texto transcrito a la IA para su procesamiento.
    -   Recibe la respuesta de la IA y la reproduce como audio utilizando síntesis de voz (ElevenLabs).
    -   Muestra el estado actual (Escuchando, Procesando, Hablando).
    -   Permite salir del modo voz y regresar a la pantalla de chat.

### 5. Pantalla de Perfil (`ProfileScreen.tsx`)
-   **Propósito:** Permitir al usuario personalizar cómo LéNOR interactúa con él, ajustando las preferencias de la IA.
-   **Funcionalidades Clave:**
    -   Presenta una serie de preguntas sobre el estilo de respuesta preferido (ej. empático, detallado, lógico, etc.).
    -   Permite al usuario activar o desactivar estas preferencias mediante interruptores (switches).
    -   Guarda las preferencias seleccionadas en Supabase, asociadas al perfil del usuario.
    -   Muestra un indicador de carga mientras se guardan las preferencias y un mensaje de confirmación.
    -   Deshabilita opciones contradictorias (ej. "detallado" y "conciso" no pueden estar activos al mismo tiempo).
    -   Muestra la fecha y hora del último guardado de preferencias.

### 6. Pantalla de Configuración (`SettingsScreen.tsx`)
-   **Propósito:** Proporcionar información sobre la cuenta del usuario, detalles técnicos de la IA, y opciones de la aplicación.
-   **Funcionalidades Clave:**
    -   Muestra el email del usuario logueado.
    -   Presenta información técnica sobre la arquitectura y capacidades de LéNOR IA.
    -   Indica si hay notas de memoria explícita guardadas.
    -   Permite activar/desactivar el "Modo Voz" globalmente (aunque la pantalla dedicada es `VoiceModeScreen`).
    -   Muestra las preferencias de IA activas (seleccionadas en `ProfileScreen`).
    -   Calcula y muestra el espacio de almacenamiento local utilizado por la app (caché).
    -   Ofrece un botón para "Limpiar caché" (borrar datos de AsyncStorage).
    -   Muestra la versión de la aplicación y un enlace al repositorio de GitHub.
    -   Permite al usuario "Cerrar Sesión".

## Personalización

### Tema y Estilos

El tema de la aplicación se puede modificar en los archivos:
- `src/theme/colors.ts`: Colores de la aplicación
- `src/theme/typography.ts`: Tipografía y estilos de texto
- `src/theme/index.ts`: Configuración general del tema

### Comportamiento de la IA

El comportamiento de la IA se puede ajustar en:
- `src/ai/system.ts`: Instrucciones base del sistema
- `src/ai/behavior.ts`: Reglas de comportamiento y tono

## Licencia

Este proyecto está licenciado bajo [Licencia MIT](LICENSE).

## Contacto

Para cualquier consulta o soporte, contactar a [tu-email@ejemplo.com].
