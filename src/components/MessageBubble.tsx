import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ViewStyle, Image } from 'react-native';
import { theme } from '../theme';
import { simulateTyping } from '../utils/chatUtils';
import { messageStore } from '../services/messageStore';
import { Message } from '../types/chat';

interface MessageBubbleProps {
  messageObject: Message;
  timestamp?: string;
  style?: ViewStyle;
  localImageUri?: string | null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  messageObject,
  timestamp,
  style,
  localImageUri,
}) => {
  const { id: messageId, text: message, isUser, animateTyping, hasBeenAnimated, timestamp: msgTimestamp, localImageUri: msgLocalImageUri } = messageObject;
  
  const [displayedText, setDisplayedText] = useState('');
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isUser && animateTyping && !hasBeenAnimated) {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      setDisplayedText('');
      cleanupRef.current = simulateTyping(
        message,
        (partialText) => {
          setDisplayedText(partialText);
        },
        (fullText) => {
          setDisplayedText(fullText);
          cleanupRef.current = null;
          messageStore.markAsAnimated(messageId);
        },
        3
      );
    } else {
      setDisplayedText(message);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [messageId, message, isUser, animateTyping, hasBeenAnimated]);

  const currentTimestamp = timestamp || msgTimestamp;
  const currentLocalImageUri = localImageUri || msgLocalImageUri;

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.botContainer, style]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        {currentLocalImageUri && (
          <Image source={{ uri: currentLocalImageUri }} style={styles.bubbleImage} />
        )}
        {displayedText && displayedText.trim() !== '' && (
          <Text selectable={true} style={[styles.messageText, isUser ? styles.userMessageText : styles.botMessageText]}>
            {displayedText}
          </Text>
        )}
      </View>
      {currentTimestamp && (
        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.botTimestamp]}>
          {currentTimestamp}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  botBubble: {
    backgroundColor: theme.colors.ui.card,
  },
  botContainer: {
    alignSelf: 'flex-start',
  },
  botMessageText: {
    color: theme.colors.text.primary,
  },
  botTimestamp: {
    alignSelf: 'flex-start',
    color: theme.colors.text.tertiary,
  },
  bubble: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  bubbleImage: {
    aspectRatio: 16 / 9,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
    width: '100%',
  },
  container: {
    marginVertical: theme.spacing.xs,
    maxWidth: '80%',
  },
  messageText: {
    ...theme.typography.styles.body1,
  },
  timestamp: {
    ...theme.typography.styles.caption,
    marginHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  userBubble: {
    backgroundColor: theme.colors.accent.primary,
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  userMessageText: {
    color: theme.colors.background.primary,
  },
  userTimestamp: {
    alignSelf: 'flex-end',
    color: theme.colors.text.tertiary,
  },
});
