import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Box, Award, BookOpen } from 'lucide-react-native';
import { Colors, Radii } from '../constants/theme';

interface TabItemConfig {
  name: string;
  label: string;
  icon: (color: string) => React.ReactNode;
}

const TABS: TabItemConfig[] = [
  {
    name: 'index',
    label: 'Studio',
    icon: (c) => <Sparkles size={20} color={c} strokeWidth={2.2} />,
  },
  {
    name: 'creations',
    label: 'Creations',
    icon: (c) => <Box size={20} color={c} strokeWidth={2.2} />,
  },
  {
    name: 'badges',
    label: 'Badges',
    icon: (c) => <Award size={20} color={c} strokeWidth={2.2} />,
  },
  {
    name: 'guide',
    label: 'Guide',
    icon: (c) => <BookOpen size={20} color={c} strokeWidth={2.2} />,
  },
];

export function GlassTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      {/* Outer Glow & Shadow Container */}
      <View style={styles.glassWrapper}>
        {/* Android / iOS Blur with Translucent Fallback */}
        <BlurView intensity={Platform.OS === 'ios' ? 45 : 30} tint="dark" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[
              'rgba(16, 38, 32, 0.90)', // Dark cutting mat deep sage
              'rgba(27, 58, 49, 0.85)',
              'rgba(16, 38, 32, 0.94)',
            ]}
            style={StyleSheet.absoluteFill}
          />
        </BlurView>

        {/* Tab Items Row */}
        <View style={styles.tabsRow}>
          {TABS.map((tab, index) => {
            const isFocused = state.index === index;
            const activeColor = Colors.tabActive;
            const inactiveColor = Colors.tabInactive;
            const iconColor = isFocused ? activeColor : inactiveColor;

            const route = state.routes[index];

            const onPress = () => {
              if (!route) return;
              const event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigateToTab(route.key);
              }
            };

            return (
              <TouchableOpacity
                key={tab.name}
                onPress={onPress}
                activeOpacity={0.7}
                style={[styles.tabButton, isFocused && styles.activeTabButton]}
              >
                {/* Active Indicator Glow Pill */}
                {isFocused && (
                  <LinearGradient
                    colors={[
                      'rgba(255, 255, 255, 0.28)',
                      'rgba(157, 184, 175, 0.16)',
                      'rgba(255, 255, 255, 0.08)',
                    ]}
                    style={styles.activePillBackground}
                  />
                )}

                <View style={styles.iconContainer}>{tab.icon(iconColor)}</View>

                <Text style={[styles.tabLabel, isFocused ? styles.activeTabLabel : styles.inactiveTabLabel]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: Platform.OS === 'ios' ? 24 : 16,
    zIndex: 999,
  },
  glassWrapper: {
    borderRadius: Radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    elevation: 12,
    backgroundColor: 'rgba(16, 38, 32, 0.92)', // Translucent fallback
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radii.lg,
    position: 'relative',
  },
  activeTabButton: {},
  activePillBackground: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 4,
    right: 4,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.glassHighlight,
  },
  iconContainer: {
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: Colors.ink,
    fontWeight: '800',
  },
  inactiveTabLabel: {
    color: Colors.tabInactive,
    fontWeight: '600',
  },
});
