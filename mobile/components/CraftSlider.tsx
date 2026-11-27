import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { Colors } from '../constants/theme';

interface CraftSliderProps {
  label: string;
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  onSlidingChange?: (sliding: boolean) => void;
}

export function CraftSlider({
  label,
  valueLabel,
  value,
  min,
  max,
  step = 1,
  onChange,
  onSlidingChange,
}: CraftSliderProps) {
  const [trackWidth, setTrackWidth] = useState(200);
  const trackWidthRef = useRef(200);
  const trackXRef = useRef(0);
  const trackViewRef = useRef<any>(null);

  const clampStep = (raw: number) => {
    const clamped = Math.max(min, Math.min(max, raw));
    const snapped = Math.round((clamped - min) / step) * step + min;
    const decimals = step < 1 ? 1 : 0;
    return Number(Math.max(min, Math.min(max, snapped)).toFixed(decimals));
  };

  const updateFromPageX = (pageX: number) => {
    const w = Math.max(20, trackWidthRef.current);
    const rel = Math.max(0, Math.min(1, (pageX - trackXRef.current) / w));
    onChange(clampStep(min + rel * (max - min)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        onSlidingChange?.(true);
        const px = evt.nativeEvent.pageX;
        trackViewRef.current?.measureInWindow((x: number) => {
          trackXRef.current = x;
          updateFromPageX(px);
        });
      },
      onPanResponderMove: (evt) => {
        updateFromPageX(evt.nativeEvent.pageX);
      },
      onPanResponderRelease: () => onSlidingChange?.(false),
      onPanResponderTerminate: () => onSlidingChange?.(false),
    })
  ).current;

  const pct = Math.max(0, Math.min(1, (value - min) / Math.max(0.001, max - min)));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setTrackWidth(w);
      trackWidthRef.current = w;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{valueLabel}</Text>
        </View>
      </View>

      <View style={styles.sliderRow}>
        <TouchableOpacity
          onPress={() => onChange(clampStep(value - step))}
          style={styles.stepBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>

        <View
          ref={trackViewRef}
          onLayout={onLayout}
          {...panResponder.panHandlers}
          style={styles.trackTouch}
        >
          <View style={styles.trackBg}>
            <View style={[styles.trackFill, { width: `${pct * 100}%` }]} />
          </View>
          <View
            style={[
              styles.thumb,
              { left: Math.max(0, Math.min(trackWidth - 22, pct * (trackWidth - 22))) },
            ]}
          />
        </View>

        <TouchableOpacity
          onPress={() => onChange(clampStep(value + step))}
          style={styles.stepBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
  },
  badge: {
    backgroundColor: Colors.softSky,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 99,
  },
  badgeText: {
    color: Colors.fold,
    fontWeight: '800',
    fontSize: 12,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.softSky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
    lineHeight: 18,
  },
  trackTouch: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    height: 8,
    borderRadius: 99,
    backgroundColor: '#E2EFFA',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: Colors.fold,
    borderRadius: 99,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.black,
    borderWidth: 3,
    borderColor: Colors.white,
    top: 4,
    shadowColor: Colors.skyShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});
