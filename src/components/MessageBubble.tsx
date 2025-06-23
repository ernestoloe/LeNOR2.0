import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Message } from "../types/chat";
import { useTheme } from "../contexts/ThemeContext";
import { Theme } from "../theme";
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  messageObject: Message;
};

export const MessageBubble: React.FC<Props> = ({ messageObject }) => {
  const { id, text, isUser, animateTyping } = messageObject;
  const theme = useTheme();
  const styles = createStyles(theme);
  const [showCopyButton, setShowCopyButton] = useState(false);

  const handleCopyText = async () => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("✅ Copiado", "Texto copiado al portapapeles");
      setShowCopyButton(false);
    } catch (error) {
      Alert.alert("❌ Error", "No se pudo copiar el texto");
      }
    };

  // Si es del usuario, renderizar con burbuja
  if (isUser) {
  return (
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{text}</Text>
      </View>
    );
  }

  // Si es de la IA, renderizar sin burbuja, solo texto con formato markdown
  return (
    <TouchableOpacity 
      style={styles.aiPlainContainer}
      onPress={() => setShowCopyButton(!showCopyButton)}
      activeOpacity={0.7}
    >
      <Markdown style={markdownStyles(theme)}>
        {text}
      </Markdown>
      
      {showCopyButton && (
        <TouchableOpacity 
          style={styles.copyButton}
          onPress={handleCopyText}
        >
          <Ionicons name="copy-outline" size={16} color={theme.colors.text.secondary} />
          <Text style={styles.copyButtonText}>Copiar</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};



// Estilos para markdown con colores y formato
const markdownStyles = (theme: Theme) => ({
  body: {
    color: theme.colors.text.primary,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'System',
  },
  heading1: {
    color: theme.colors.text.primary,
    fontSize: 24,
    fontWeight: 'bold' as 'bold',
    marginVertical: 8,
  },
  heading2: {
    color: theme.colors.text.primary,
    fontSize: 20,
    fontWeight: 'bold' as 'bold',
    marginVertical: 6,
  },
  heading3: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: 'bold' as 'bold',
    marginVertical: 4,
  },
  paragraph: {
    color: theme.colors.text.primary,
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 4,
  },
  strong: {
    color: theme.colors.text.primary,
    fontWeight: 'bold' as 'bold',
  },
  em: {
    color: theme.colors.text.primary,
    fontStyle: 'italic' as 'italic',
  },
  code_inline: {
    backgroundColor: theme.colors.background.tertiary,
    color: theme.colors.accent.primary,
    fontFamily: 'monospace',
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: theme.colors.background.tertiary,
    color: theme.colors.text.primary,
    fontFamily: 'monospace',
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent.primary,
  },
  fence: {
    backgroundColor: theme.colors.background.tertiary,
    color: theme.colors.text.primary,
    fontFamily: 'monospace',
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent.primary,
  },
  list_item: {
    color: theme.colors.text.primary,
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 2,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  blockquote: {
    backgroundColor: theme.colors.background.secondary,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent.primary,
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
    fontStyle: 'italic',
  },
  link: {
    color: theme.colors.accent.primary,
    textDecorationLine: 'underline' as 'underline',
  },
  table: {
    borderWidth: 1,
    borderColor: theme.colors.text.secondary,
    marginVertical: 8,
  },
  thead: {
    backgroundColor: theme.colors.background.secondary,
  },
  th: {
    color: theme.colors.text.primary,
    fontWeight: 'bold' as 'bold',
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.text.secondary,
  },
  td: {
    color: theme.colors.text.primary,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.text.secondary,
  },
});

const createStyles = (theme: Theme) => StyleSheet.create({
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: theme.colors.ui.button.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    maxWidth: "80%",
    marginVertical: 4,
    shadowColor: theme.colors.background.primary,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  userText: {
    color: theme.colors.text.onAccent,
    fontSize: 16,
    fontWeight: "500",
  },
  aiPlainContainer: {
    alignSelf: "flex-start",
    maxWidth: "95%",
    marginVertical: 4,
    paddingHorizontal: 0, // Sin padding para que sea texto plano
    position: 'relative', // Para posicionar el botón de copiar
  },
  copyButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    padding: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.background.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.background.primary,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  copyButtonText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
});
