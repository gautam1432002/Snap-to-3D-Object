import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';
import { Colors } from '../constants/theme';

interface CuttingMatBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  showTopRuler?: boolean;
}

/**
 * Full-screen #1b3a31 cutting-mat backdrop with SVG 24×24 #25493e grid pattern
 * and subtle top ruler tick marks matching `.phone` in the HTML prototype.
 */
export function CuttingMatBackground({
  children,
  style,
  showTopRuler = true,
}: CuttingMatBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern
              id="cuttingMatGrid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <Path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke={Colors.mat2}
                strokeWidth="1"
              />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={Colors.mat} />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#cuttingMatGrid)" />
        </Svg>
      </View>

      {showTopRuler && (
        <View style={styles.rulerStrip} pointerEvents="none">
          <Svg width="100%" height="7">
            <Defs>
              <Pattern id="topRulerTicks" width="12" height="7" patternUnits="userSpaceOnUse">
                <Rect x="0" y="0" width="1.5" height="7" fill="rgba(255,255,255,0.22)" />
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="7" fill="url(#topRulerTicks)" />
          </Svg>
        </View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mat,
  },
  rulerStrip: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 7,
    zIndex: 50,
  },
});
