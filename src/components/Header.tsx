import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { theme } from '../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightComponent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, rightComponent }) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {rightComponent && <View style={styles.rightComponent}>{rightComponent}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderBottomColor: theme.colors.ui.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  rightComponent: {
    marginLeft: theme.spacing.md,
  },
  subtitle: {
    ...theme.typography.styles.body2,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  title: {
    ...theme.typography.styles.h3,
    color: theme.colors.text.primary,
  },
  titleContainer: {
    flex: 1,
  },
});
