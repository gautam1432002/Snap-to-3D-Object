import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { BottomTabBarProps } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Home, Layers, Settings } from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface TabItemConfig {
  name: string;
  label: string;
  icon: (color: string) => React.ReactNode;
}

const TABS: TabItemConfig[] = [
  {
    name: 'index',
    label: 'Home',
    icon: (c) => <Home size={20} color={c} strokeWidth={2.2} />,
  },
  {
    name: 'creations',
    label: 'Creations',
    icon: (c) => <Layers size={20} color={c} strokeWidth={2.2} />,
  },
  {
    name: 'settings',
    label: 'Settings',
    icon: (c) => <Settings size={20} color={c} strokeWidth={2.2} />,
  },
];

const SPRING_CONFIG = { damping: 18, stiffness: 180, mass: 0.8 };

function AnimatedTabIcon({
  isFocused,
  children,
}: {
  isFocused: boolean;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(isFocused ? 1.08 : 1);
  const translateY = useSharedValue(isFocused ? -1.5 : 0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.08 : 1, SPRING_CONFIG);
    translateY.value = withSpring(isFocused ? -1.5 : 0, SPRING_CONFIG);
  }, [isFocused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.iconContainer, animStyle]}>{children}</Animated.View>;
}

export function GlassTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState<number>(0);
  const indicatorX = useSharedValue(0);

  const activeRouteName = state.routes[state.index]?.name || 'index';
  const activeVisualIdx = Math.max(
    0,
    TABS.findIndex((t) => t.name === activeRouteName)
  );
  const tabWidth = rowWidth > 0 ? rowWidth / TABS.length : 0;

  useEffect(() => {
    if (tabWidth <= 0) return;
    indicatorX.value = withSpring(activeVisualIdx * tabWidth, SPRING_CONFIG);
  }, [activeVisualIdx, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - rowWidth) > 1) {
      setRowWidth(w);
      indicatorX.value = activeVisualIdx * (w / TABS.length);
    }
  };

  return (
    <View
      style={[
        styles.floatingContainer,
        { bottom: Math.max(insets.bottom, 10) + 6 },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.glassWrapper}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 45 : 32}
          tint="dark"
          style={StyleSheet.absoluteFill}
        >
          <LinearGradient
            colors={[
              'rgba(16, 38, 32, 0.84)',
              'rgba(27, 58, 49, 0.72)',
              'rgba(16, 38, 32, 0.90)',
            ]}
            style={StyleSheet.absoluteFill}
          />
        </BlurView>

        <View style={styles.tabsRow} onLayout={handleLayout}>
          {tabWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.slidingGlassPill,
                { width: tabWidth },
                indicatorStyle,
              ]}
            >
              <LinearGradient
                colors={[
                  'rgba(255, 255, 255, 0.34)',
                  'rgba(157, 184, 175, 0.18)',
                  'rgba(255, 255, 255, 0.12)',
                ]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}

          {TABS.map((tab) => {
            const routeIdx = state.routes.findIndex((r) => r.name === tab.name);
            const route = routeIdx >= 0 ? state.routes[routeIdx] : undefined;
            const isFocused = routeIdx === state.index;
            const iconColor = isFocused ? Colors.ruler : Colors.sage;

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
                activeOpacity={0.78}
                style={styles.tabButton}
              >
                <AnimatedTabIcon isFocused={isFocused}>
                  {tab.icon(iconColor)}
                </AnimatedTabIcon>
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.activeTabLabel : styles.inactiveTabLabel,
                  ]}
                >
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
    left: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassWrapper: {
    width: '100%',
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glassNav,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.44,
    shadowRadius: 24,
    elevation: 16,
    padding: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  slidingGlassPill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 18,
    zIndex: 2,
  },
  iconContainer: {
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
  inactiveTabLabel: {
    color: Colors.sage,
    fontWeight: '600',
  },
});
