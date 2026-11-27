import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { BottomTabBarProps } from 'expo-router/tabs';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Home, Archive, SlidersHorizontal, Camera } from 'lucide-react-native';
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
    icon: (c) => <Home size={19} color={c} strokeWidth={2.3} />,
  },
  {
    name: 'creations',
    label: 'Vault',
    icon: (c) => <Archive size={19} color={c} strokeWidth={2.3} />,
  },
  {
    name: 'settings',
    label: 'Setup',
    icon: (c) => <SlidersHorizontal size={19} color={c} strokeWidth={2.3} />,
  },
];

const DROPLET_SPRING = { damping: 16, stiffness: 185, mass: 0.78 };

function AnimatedTabIcon({
  isFocused,
  children,
}: {
  isFocused: boolean;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(isFocused ? 1.08 : 1);
  const translateY = useSharedValue(isFocused ? -1 : 0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.08 : 1, DROPLET_SPRING);
    translateY.value = withSpring(isFocused ? -1 : 0, DROPLET_SPRING);
  }, [isFocused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.iconContainer, animStyle]}>{children}</Animated.View>;
}

/**
 * Fluid iOS 27 Frosted White Liquid Glass Split Dock:
 * - Left 3-tab frosted white capsule with elastic Jet-Black droplet indicator
 * - Right detached floating dark-obsidian Camera Scan Orb
 */
export function GlassTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [rowWidth, setRowWidth] = useState<number>(0);

  const indicatorX = useSharedValue(0);
  const squishX = useSharedValue(1);
  const squishY = useSharedValue(1);
  const orbScale = useSharedValue(1);

  const activeRouteName = state.routes[state.index]?.name || 'index';
  const activeVisualIdx = Math.max(
    0,
    TABS.findIndex((t) => t.name === activeRouteName)
  );
  const tabWidth = rowWidth > 0 ? rowWidth / TABS.length : 0;

  useEffect(() => {
    if (tabWidth <= 0) return;
    indicatorX.value = withSpring(activeVisualIdx * tabWidth, DROPLET_SPRING);
    squishX.value = withSequence(
      withTiming(1.18, { duration: 110 }),
      withSpring(1, { damping: 14, stiffness: 220 })
    );
    squishY.value = withSequence(
      withTiming(0.88, { duration: 110 }),
      withSpring(1, { damping: 14, stiffness: 220 })
    );
  }, [activeVisualIdx, tabWidth]);

  const dropletStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: indicatorX.value },
      { scaleX: squishX.value },
      { scaleY: squishY.value },
    ],
  }));

  const orbAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
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
        styles.dockRow,
        { bottom: Math.max(insets.bottom, 10) + 6 },
      ]}
      pointerEvents="box-none"
    >
      {/* Left Frosted White 3-Tab Capsule */}
      <View style={styles.capsuleShell}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 55 : 42}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.frostedOverlay} pointerEvents="none" />

        <View style={styles.tabsRow} onLayout={handleLayout}>
          {tabWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.jetDroplet,
                { width: tabWidth },
                dropletStyle,
              ]}
            />
          )}

          {TABS.map((tab) => {
            const routeIdx = state.routes.findIndex((r) => r.name === tab.name);
            const route = routeIdx >= 0 ? state.routes[routeIdx] : undefined;
            const isFocused = routeIdx === state.index;
            const iconColor = isFocused ? Colors.white : '#475569';

            const onPress = () => {
              if (!route) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
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
                activeOpacity={0.8}
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

      {/* Right Detached Floating Dark-Obsidian Scan Orb */}
      <Animated.View style={orbAnimStyle}>
        <Pressable
          onPress={() => router.push('/workflow')}
          onPressIn={() => {
            orbScale.value = withSpring(0.92, { damping: 14, stiffness: 280 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
          }}
          onPressOut={() => {
            orbScale.value = withSpring(1, { damping: 14, stiffness: 240 });
          }}
          style={styles.scanOrb}
          accessibilityLabel="Scan Real Object"
        >
          <LinearGradient
            colors={['#273244', '#0F172A']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.orbGradient}
          >
            <Camera size={25} color={Colors.white} strokeWidth={2.2} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  capsuleShell: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.glassRim,
    backgroundColor: Colors.glassWhite,
    shadowColor: Colors.skyShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
    padding: 5,
  },
  frostedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  jetDroplet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 27,
    backgroundColor: Colors.black,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    zIndex: 2,
  },
  iconContainer: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10.5,
    letterSpacing: 0.1,
  },
  activeTabLabel: {
    color: Colors.white,
    fontWeight: '800',
  },
  inactiveTabLabel: {
    color: '#475569',
    fontWeight: '700',
  },
  scanOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.glassRim,
    overflow: 'hidden',
    shadowColor: Colors.skyShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 16,
    elevation: 14,
  },
  orbGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
