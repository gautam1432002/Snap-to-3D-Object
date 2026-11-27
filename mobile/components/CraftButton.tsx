import React from 'react';
import {
  Pressable,
  Text,
  View,
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
import { ArrowRight } from 'lucide-react-native';
import { Colors } from '../constants/theme';

export type CraftButtonVariant =
  | 'primary'
  | 'secondary'
  | 'soft'
  | 'paper'
  | 'teal'
  | 'alt'
  | 'danger';

interface CraftButtonProps {
  title: string;
  onPress: () => void;
  variant?: CraftButtonVariant;
  small?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  showArrowBadge?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const PRESS_SPRING = { damping: 16, stiffness: 260, mass: 0.7 };

/**
 * Sunlit pill CTA button with UI-thread Reanimated spring press physics.
 * - `primary`: Jet-Black (`#111827`) pill with crisp 38x38 white circular `→` badge
 * - `secondary` / `soft` / `paper`: Pure-white elevated pill
 * - `danger`: Soft coral pill (`#FFE4E6` / `#E11D48`)
 */
export function CraftButton({
  title,
  onPress,
  variant = 'primary',
  small = false,
  disabled = false,
  loading = false,
  icon,
  showArrowBadge,
  style,
  textStyle,
}: CraftButtonProps) {
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => {
    const scale = 1 - pressed.value * 0.035;
    const translateY = pressed.value * 2;
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isTeal = variant === 'teal';
  const showCircleArrow = showArrowBadge ?? (isPrimary && !small && !loading);

  const bgStyle = isPrimary
    ? styles.primaryBg
    : isDanger
    ? styles.dangerBg
    : isTeal
    ? styles.tealBg
    : styles.softBg;

  const textColorStyle = isPrimary
    ? styles.textWhite
    : isDanger
    ? styles.textDanger
    : isTeal
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
          showCircleArrow && styles.baseWithArrow,
          bgStyle,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={isPrimary || isTeal ? '#FFFFFF' : isDanger ? Colors.dangerText : Colors.ink}
          />
        ) : showCircleArrow ? (
          <View style={styles.arrowLayout}>
            <View style={{ width: 38 }} />
            <View style={styles.centerLabelWrap}>
              {icon}
              <Text
                style={[styles.text, small && styles.textSmall, textColorStyle, textStyle]}
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>
            <View style={styles.arrowCircle}>
              <ArrowRight size={18} color={Colors.black} strokeWidth={2.5} />
            </View>
          </View>
        ) : (
          <>
            {icon}
            <Text
              style={[styles.text, small && styles.textSmall, textColorStyle, textStyle]}
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
    gap: 7,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    shadowColor: Colors.skyShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  baseWithArrow: {
    paddingVertical: 7,
    paddingLeft: 12,
    paddingRight: 7,
  },
  small: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  primaryBg: {
    backgroundColor: Colors.black,
  },
  softBg: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.softSkyBorder,
  },
  tealBg: {
    backgroundColor: Colors.fold,
  },
  dangerBg: {
    backgroundColor: Colors.dangerBg,
    shadowOpacity: 0.06,
  },
  disabled: {
    opacity: 0.52,
  },
  arrowLayout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centerLabelWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  arrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
  },
  textSmall: {
    fontSize: 13,
  },
  textWhite: {
    color: Colors.white,
  },
  textInk: {
    color: Colors.ink,
  },
  textDanger: {
    color: Colors.dangerText,
  },
});
