import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/theme';

export type CraftButtonVariant = 'primary' | 'paper' | 'teal' | 'alt' | 'danger';

interface CraftButtonProps {
  title: string;
  onPress: () => void;
  variant?: CraftButtonVariant;
  small?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const PRESS_SPRING = { damping: 16, stiffness: 260, mass: 0.7 };

/**
 * Tactile 3D craft push-button with UI-thread Reanimated spring press physics
 * (`scale: 0.965`, `translateY: 2`) and subtle light haptic feedback.
 */
export function CraftButton({
  title,
  onPress,
  variant = 'primary',
  small = false,
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: CraftButtonProps) {
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => {
    const scale = 1 - pressed.value * 0.035; // 1 -> 0.965
    const translateY = pressed.value * 2;    // 0 -> 2
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  const isDashed = variant === 'alt';

  const variantStyle =
    variant === 'paper'
      ? styles.paper
      : variant === 'teal'
      ? styles.teal
      : variant === 'alt'
      ? styles.alt
      : variant === 'danger'
      ? styles.danger
      : styles.primary;

  const variantText =
    variant === 'alt'
      ? styles.textLight
      : variant === 'danger'
      ? styles.textWhite
      : styles.textInk;

  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    if (isDisabled) return;
    pressed.value = withSpring(1, PRESS_SPRING);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0, PRESS_SPRING);
  };

  return (
    <Animated.View style={[style, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          styles.base,
          small && styles.small,
          variantStyle,
          isDashed && styles.altBorder,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'alt' || variant === 'danger' ? '#ffffff' : Colors.ink}
          />
        ) : (
          <>
            {icon}
            <Text
              style={[
                styles.text,
                small && styles.textSmall,
                variantText,
                textStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.ink,
    shadowColor: '#101714',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  primary: {
    backgroundColor: Colors.ruler,
  },
  paper: {
    backgroundColor: Colors.paper,
  },
  teal: {
    backgroundColor: Colors.teal,
  },
  danger: {
    backgroundColor: Colors.cut,
  },
  alt: {
    backgroundColor: 'rgba(16, 38, 32, 0.85)',
    shadowOpacity: 0,
    elevation: 0,
  },
  altBorder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.sage,
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
  },
  textSmall: {
    fontSize: 12,
  },
  textInk: {
    color: Colors.ink,
  },
  textLight: {
    color: Colors.inkOnMat,
    fontWeight: '700',
  },
  textWhite: {
    color: '#ffffff',
  },
});
