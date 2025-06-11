export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  isTyping?: boolean;
  fullText?: string; // Para almacenar el texto completo mientras se muestra el efecto typing
  localImageUri?: string | null; // Add optional local image URI
  animateTyping?: boolean;
  hasBeenAnimated?: boolean; // Nuevo campo para rastrear si la animación de typing ya ocurrió
  senderId?: string;
  role?: 'user' | 'assistant' | 'system';
  status?: 'sending' | 'sent' | 'error';
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface AIResponse {
  text: string;
  model: string;
  timestamp: string;
}
