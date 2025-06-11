export const colors = {
  // Base colors
  background: {
    primary: '#000000', // Negro más profundo
    secondary: '#1C1C1C', // Gris oscuro para elementos secundarios
    tertiary: '#2A2A2A', // Gris para Cards/componentes
  },
  
  // Accent colors (TURQUESA LÉNOR - Más oscuro)
  accent: {
    primary: '#20C2B3', // Turquesa principal más oscuro
    secondary: '#1AA093', // Turquesa aún más oscuro
    tertiary: '#4DD1C4', // Turquesa más claro (ajustado)
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF', // Blanco
    secondary: '#B0B0B0', // Gris claro
    tertiary: '#757575', // Gris medio
    disabled: '#4F4F4F', // Gris oscuro para deshabilitado
    onAccent: '#FFFFFF', // Texto sobre fondo verde (generalmente blanco)
  },
  
  // Status colors (Mantener para claridad)
  status: {
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#FF5252', // Rojo ligeramente más brillante
    info: '#2196F3', // Azul (o puedes cambiarlo a un gris si prefieres)
  },
  
  transparent: 'transparent', // Añadido para consistencia
  
  // UI element colors
  ui: {
    divider: '#333333', // Divisor gris oscuro
    card: '#2A2A2A', // Valor de background.tertiary
    input: {
      background: '#1C1C1C', // Valor de background.secondary
      border: '#444444', // Borde gris
      focusBorder: '#20C2B3', // Usar nuevo turquesa principal
    },
    button: {
      primary: '#20C2B3', // Usar nuevo turquesa principal
      secondary: '#4A4A4A', // Botón secundario gris oscuro
      outlineBorder: '#20C2B3', // Usar nuevo turquesa principal
      disabled: '#3A3A3A', // Fondo deshabilitado
    },
  },
};
