import React from 'react';
import { StyleSheet, View, Text, TextInput, TextInputProps, Platform } from 'react-native';
import { theme } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: object;
  inputStyle?: object;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error ? styles.inputError : null,
          props.multiline ? styles.multilineInput : styles.singleLineInput,
          inputStyle,
          style
        ]}
        placeholderTextColor={theme.colors.text.tertiary}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  errorText: {
    ...theme.typography.styles.caption,
    color: theme.colors.status.error,
    marginTop: theme.spacing.xs,
  },
  helperText: {
    ...theme.typography.styles.caption,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  input: {
    ...theme.typography.styles.body1,
    backgroundColor: theme.colors.ui.input.background,
    borderColor: theme.colors.ui.input.border,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    color: theme.colors.text.primary,
    paddingHorizontal: theme.spacing.md,
  },
  inputError: {
    borderColor: theme.colors.status.error,
  },
  label: {
    ...theme.typography.styles.body2,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  multilineInput: {
    maxHeight: 120,
    minHeight: theme.spacing.xxl,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.md,
    textAlignVertical: 'top',
  },
  singleLineInput: {
    height: Platform.OS === 'ios' ? theme.spacing.xxl : undefined,
    paddingVertical: theme.spacing.md,
  },
});

export default Input;
