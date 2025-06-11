import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { AppNavigator } from './AppNavigator';
import AuthScreen from '../screens/AuthScreen';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { theme } from '../theme';

const Stack = createStackNavigator();

export const RootNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <AppNavigator />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth">
            {() => (
              <AuthScreen />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    flex: 1,
    justifyContent: 'center',
  },
});
