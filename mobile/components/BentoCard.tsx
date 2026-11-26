import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii, Spacing, Typography } from '../constants/theme';

interface BentoCardProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  gradientColors?: [string, string, ...string[]];
}

export function BentoCard({
  title,
  subtitle,
  badge,
  badgeColor,
  icon,
  rightElement,
  children,
  onPress,
  style,
  gradientColors = ['rgba(20, 26, 23, 0.85)', 'rgba(16, 22, 20, 0.92)'],
}: BentoCardProps) {
  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={[styles.cardOuter, style]}
    >
      <LinearGradient colors={gradientColors} style={styles.cardInner}>
        {/* Header Row if title / badge / rightElement provided */}
        {(title || badge || rightElement || icon) && (
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {icon && <View style={styles.iconBox}>{icon}</View>}
              <View>
                {title && <Text style={styles.titleText}>{title}</Text>}
                {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
              </View>
            </View>

            <View style={styles.headerRight}>
              {badge && (
                <View
                  style={[
                    styles.badgePill,
                    badgeColor ? { borderColor: badgeColor } : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      badgeColor ? { color: badgeColor } : null,
                    ]}
                  >
                    {badge}
                  </Text>
                </View>
              )}
              {rightElement}
            </View>
          </View>
        )}

        {/* Card Body */}
        {children && <View style={styles.bodyContent}>{children}</View>}
      </LinearGradient>
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: Spacing.md,
  },
  cardInner: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleText: {
    ...Typography.title3,
    color: Colors.ink,
  },
  subtitleText: {
    ...Typography.caption,
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.teal,
    backgroundColor: 'rgba(46, 196, 182, 0.12)',
  },
  badgeText: {
    ...Typography.tag,
    color: Colors.teal,
  },
  bodyContent: {
    marginTop: Spacing.xs,
  },
});
