import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, Radii } from '../constants/theme';

interface PaperSheetProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pure-white elevated sunlit studio card (`#FFFFFF`, `borderRadius: 26`,
 * subtle specular rim, and soft sky-tinted elevation shadow).
 */
export function PaperSheet({ children, style }: PaperSheetProps) {
  return <View style={[styles.sheet, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    shadowColor: Colors.skyShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 6,
  },
});
