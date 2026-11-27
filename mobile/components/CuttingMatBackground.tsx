import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Ellipse, G } from 'react-native-svg';
import { Colors } from '../constants/theme';

interface CuttingMatBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  showTopRuler?: boolean;
}

/**
 * Full-screen sunlit sky-blue gradient backdrop (`#4FC3FF -> #C9EEFF -> #F2FBFF -> #E5F9EA`)
 * with soft translucent clouds near the top and layered pastel mint rolling hills at the bottom.
 */
export function CuttingMatBackground({
  children,
  style,
}: CuttingMatBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[Colors.skyTop, Colors.skyMid, Colors.skyLow, Colors.meadowTint]}
        locations={[0, 0.34, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft Translucent Sky Clouds */}
      <View style={styles.cloudsLayer} pointerEvents="none">
        <Svg width="100%" height={180} viewBox="0 0 400 180" preserveAspectRatio="none">
          <G opacity={0.42}>
            <Ellipse cx="72" cy="54" rx="54" ry="22" fill="#FFFFFF" />
            <Ellipse cx="105" cy="48" rx="34" ry="20" fill="#FFFFFF" />
            <Ellipse cx="44" cy="58" rx="28" ry="15" fill="#FFFFFF" />
          </G>
          <G opacity={0.34}>
            <Ellipse cx="322" cy="84" rx="58" ry="22" fill="#FFFFFF" />
            <Ellipse cx="288" cy="78" rx="36" ry="18" fill="#FFFFFF" />
            <Ellipse cx="356" cy="88" rx="28" ry="14" fill="#FFFFFF" />
          </G>
          <G opacity={0.25}>
            <Ellipse cx="198" cy="36" rx="44" ry="14" fill="#FFFFFF" />
          </G>
        </Svg>
      </View>

      {/* Layered Pastel Mint-Green Rolling Hills anchored at bottom */}
      <View style={styles.hillsLayer} pointerEvents="none">
        <Svg width="100%" height={185} viewBox="0 0 400 185" preserveAspectRatio="none">
          <Path
            d="M0,78 C95,22 205,105 315,52 C355,33 382,42 400,56 L400,185 L0,185 Z"
            fill={Colors.hillLight}
          />
          <Path
            d="M0,108 C85,78 165,54 255,90 C320,116 365,92 400,76 L400,185 L0,185 Z"
            fill={Colors.hillMain}
          />
        </Svg>
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.skyMid,
  },
  cloudsLayer: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    height: 180,
  },
  hillsLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 185,
  },
});
