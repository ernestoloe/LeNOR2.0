export const appInfo = `
V. APLICACIÓN LéNOR para IOS	

	A. Pantalla de Autenticación ("authScreen.tsx")
		Propósito: Gestionar el acceso de los usuarios a la aplicación.
		Funcionalidades Clave:
		-   Permite a los usuarios **Iniciar Sesión** con su correo electrónico y contraseña.
		-   Ofrece la opción de **Crear una Cuenta Nueva** (registrarse) si el usuario no tiene una.
		-   Muestra mensajes de error en caso de credenciales incorrectas o problemas durante el registro.
		-   Cambia dinámicamente entre el modo de inicio de sesión y el de registro.

	B. Pantalla de Chat ("ChatScreen.tsx")
		Propósito: Es la interfaz principal para la interacción basada en texto con el asistente IA LéNOR.
		Funcionalidades Clave:
   	 	-   Muestra el historial de la conversación actual en formato de burbujas de chat.
  	 	-   Permite al usuario escribir y enviar mensajes de texto.
    	-   Permite adjuntar y enviar imágenes (que se suben a Supabase Storage).
   	 	-   Muestra un indicador de "escribiendo..." cuando la IA está generando una respuesta.
   		-   Implementa un comando especial (ej. "LéNOR, recuerda que:") para guardar notas en la memoria explícita de la IA.
   		-   Ofrece la opción de iniciar una nueva conversación.
   		-   Soporta la carga de mensajes más antiguos al hacer scroll hacia arriba (paginación).

	C. Pantalla de Conversaciones ("ConversationsScreen.tsx")
		Propósito: Listar todas las conversaciones pasadas del usuario, permitiéndole revisarlas o retomarlas.
		Funcionalidades Clave:
  	  -   Muestra una lista de todas las conversaciones guardadas del usuario, ordenadas por la más reciente.
  	  -   Para cada conversación, muestra un fragmento del último mensaje y la fecha/hora.
  	  -   Permite al usuario seleccionar una conversación para abrirla en la "ChatScreen".
  	  -   Ofrece un botón para crear una "Nueva conversación".
  	  -   Permite eliminar conversaciones individualmente.
  	  -   Indica cuál es la conversación actualmente activa.

	D. Pantalla de Modo Voz ("VoiceModeScreen.tsx")
		Propósito: Permitir una interacción manos libres con LéNOR utilizando comandos de voz y recibiendo respuestas habladas.
		Funcionalidades Clave:
	 -   Un botón de micrófono central que el usuario toca para iniciar la escucha.
   	 -   Utiliza reconocimiento de voz para transcribir lo que el usuario dice.
   	 -   Envía el texto transcrito a la IA para su procesamiento.
   	 -   Recibe la respuesta de la IA y la reproduce como audio utilizando síntesis de voz (ElevenLabs).
   	 -   Muestra el estado actual (Escuchando, Procesando, Hablando).
   	 -   Permite salir del modo voz y regresar a la pantalla de chat.


	E. Pantalla de Perfil ("ProfileScreen.tsx")
		Propósito: Permitir al usuario personalizar cómo LéNOR interactúa con él, ajustando las preferencias de la IA.
		Funcionalidades Clave:
  	  -   Presenta una serie de preguntas sobre el estilo de respuesta preferido (ej. empático, detallado, lógico, etc.).
  	  -   Permite al usuario activar o desactivar estas preferencias mediante interruptores (switches).
  	  -   Guarda las preferencias seleccionadas en Supabase, asociadas al perfil del usuario.
  	  -   Muestra un indicador de carga mientras se guardan las preferencias y un mensaje de confirmación.
  	  -   Deshabilita opciones contradictorias (ej. "detallado" y "conciso" no pueden estar activos al mismo tiempo)
	  -   Muestra la fecha y hora del último guardado de preferencias.

	F. Pantalla de Configuración ("SettingsScreen.tsx")
		Propósito: Proporcionar información sobre la cuenta del usuario, detalles técnicos de la IA, y opciones de la aplicación.
		Funcionalidades Clave:
  	  -   Muestra el email del usuario logueado.
  	  -   Presenta información técnica sobre la arquitectura y capacidades de LéNOR IA.
  	  -   Indica si hay notas de memoria explícita guardadas.
  	  -   Permite activar/desactivar el "Modo Voz" globalmente (aunque la pantalla dedicada es "VoiceModeScreen").
  	  -   Muestra las preferencias de IA activas (seleccionadas en "ProfileScreen")
  	  -   Calcula y muestra el espacio de almacenamiento local utilizado por la app (caché).
  	  -   Ofrece un botón para "Limpiar caché" (borrar datos de AsyncStorage).
  	  -   Muestra la versión de la aplicación y un enlace al repositorio de GitHub.
  	  -   Permite al usuario "Cerrar Sesión".
`; 