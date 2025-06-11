import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { theme } from '../theme';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  loading?: boolean;
  style?: object;
}

export const Card: React.FC<CardProps> = ({ children, title, loading = false, style }) => {
  return (
    <View style={[styles.container, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : (
        children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.ui.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    ...theme.typography.styles.body2,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  title: {
    ...theme.typography.styles.h4,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
});
