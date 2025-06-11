import React, { useState } from 'react';
import { StyleSheet, View, Text, KeyboardAvoidingView, ScrollView, Platform, Image, Alert } from 'react-native';
import { Container, Card, Input, Button } from '../components';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import logoIconSource from '../../assets/lenor-icon.png';

const AuthScreen: React.FC = () => {
  const { signIn, signUp, isLoading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const toggleMode = () => {
    setIsLoginMode(prevMode => !prevMode);
    setError('');
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Por favor ingresa email y contraseña');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setError('');
    
    try {
      if (isLoginMode) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        Alert.alert('Registro Exitoso', 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.');
        setIsLoginMode(true);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido durante la autenticación';
      Alert.alert(
        isLoginMode ? 'Error de inicio de sesión' : 'Error de registro',
        errorMessage
      );
      console.error('Auth error:', error);
    }
  };

  return (
    <Container style={styles.outerContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image 
              source={logoIconSource}
              style={styles.logoImage}
            />
            <Text style={styles.logoText}>LéNOR</Text>
            <Text style={styles.tagline}>Diseñado para pensar contigo</Text>
          </View>
          
          <Card style={styles.card}>
            <Text style={styles.title}>
              {isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Text>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <Input
              label="Email"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
            />
            
            <Input
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />
            
            <Button
              title={isLoginMode ? 'Iniciar Sesión' : 'Regístrate'}
              onPress={handleSubmit}
              variant="primary"
              size="large"
              fullWidth
              disabled={isLoading}
            />
            
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isLoginMode ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
              </Text>
              <Button
                title={isLoginMode ? 'Registrarse' : 'Iniciar Sesión'}
                onPress={toggleMode}
                variant="outline"
                size="small"
                disabled={isLoading}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  errorText: {
    ...theme.typography.styles.body2,
    color: theme.colors.status.error,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  keyboardAvoidingView: { 
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoImage: {
    height: 100,
    marginBottom: theme.spacing.md,
    width: 100,
  },
  logoText: {
    ...theme.typography.styles.h1,
    color: theme.colors.accent.primary,
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 60,
  },
  outerContainer: {
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  tagline: {
    ...theme.typography.styles.body1,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  title: {
    ...theme.typography.styles.h2,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  toggleContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  toggleText: {
    ...theme.typography.styles.body2,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.sm,
  },
});

export default AuthScreen;
