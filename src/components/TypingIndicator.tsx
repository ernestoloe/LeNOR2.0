import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import { theme } from '../theme';

interface TypingIndicatorProps {
  style?: object;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ style }) => {
  const animasi1 = useRef(new Animated.Value(0)).current;
  const animasi2 = useRef(new Animated.Value(0)).current;
  const animasi3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (animation: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: -5,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
            delay,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(200)
        ])
      );
    };

    const anim1 = createAnimation(animasi1, 0);
    const anim2 = createAnimation(animasi2, 150);
    const anim3 = createAnimation(animasi3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [animasi1, animasi2, animasi3]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.dotContainer}>
        <Animated.View style={[styles.dot, { transform: [{ translateY: animasi1 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: animasi2 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: animasi3 }] }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.ui.card,
    borderRadius: theme.borderRadius.lg,
    marginVertical: theme.spacing.xs,
    maxWidth: '50%',
    padding: theme.spacing.md,
  },
  dot: {
    backgroundColor: theme.colors.accent.primary,
    borderRadius: 4,
    height: 8,
    marginHorizontal: 3,
    width: 8,
  },
  dotContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 20,
    justifyContent: 'center',
  },
});
