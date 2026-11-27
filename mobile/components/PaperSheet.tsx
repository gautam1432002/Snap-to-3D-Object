import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, Radii } from '../constants/theme';

interface PaperSheetProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tactile `#fdfdfb` off-white craft paper card with `2px solid #17201d` border,
 * `18px` radius, and hard offset shadow matching `.sheet` in the HTML prototype.
 */
export function PaperSheet({ children, style }: PaperSheetProps) {
  return <View style={[styles.sheet, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderColor: Colors.ink,
    padding: 13,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.34,
    shadowRadius: 0,
    elevation: 5,
  },
});
