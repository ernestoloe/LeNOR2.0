// import { Message } from '../types/chat'; // Eliminado por no usarse

// Simula el efecto de typing para mostrar el texto gradualmente
export const simulateTyping = (
  text: string,
  onUpdate: (text: string) => void,
  onComplete: (text: string) => void,
  baseDelay: number = 10
): (() => void) => {
  let currentIndex = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let isCancelled = false;
  
  const getRandomDelay = () => {
    // Añadir variación aleatoria al delay base
    const variation = Math.random() * 20;
    return baseDelay + variation;
  };

  const typeNextChar = () => {
    if (isCancelled) return;

    if (currentIndex < text.length) {
      const nextChar = text[currentIndex];
      onUpdate(text.substring(0, currentIndex + 1));
      currentIndex++;

      // Ajustar velocidad según el tipo de carácter
      let delay = getRandomDelay();
      if (nextChar === '.' || nextChar === '!' || nextChar === '?') {
        delay *= 3; // Pausa más larga después de puntuación
      } else if (nextChar === ',' || nextChar === ';') {
        delay *= 2; // Pausa media después de comas
      } else if (nextChar === ' ') {
        delay *= 0.8; // Más rápido en espacios
      }

      timeoutId = setTimeout(typeNextChar, delay);
    } else {
      onComplete(text);
    }
  };

  // Iniciar la animación
  timeoutId = setTimeout(typeNextChar, getRandomDelay());

  // Retornar función de limpieza
  return () => {
    isCancelled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
};

// Formatea la fecha actual para el mensaje
export const getCurrentTimestamp = (): string => {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
