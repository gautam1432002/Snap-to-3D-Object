import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

const NativeWebView = WebView as unknown as React.ComponentType<any>;
import { Colors } from '../../constants/theme';
import { PaperSheet } from '../PaperSheet';
import { CraftButton } from '../CraftButton';
import { CraftSlider } from '../CraftSlider';
import { ContourPoint } from '../../utils/sampleTemplates';
import { buildThreeModelHtml } from '../../utils/threeHtml';

interface Stage3Preview3DProps {
  artworkUri: string;
  contour: ContourPoint[];
  edgeColorHex: string;
  moldStyle: 'block' | 'standee';
  heightCm: number;
  depthCm: number;
  smoothness: 'Easy' | 'Medium' | 'Hard';
  includeStand: boolean;
  onChangeMoldStyle: (style: 'block' | 'standee') => void;
  onChangeHeight: (h: number) => void;
  onChangeDepth: (d: number) => void;
  onChangeSmoothness: (s: 'Easy' | 'Medium' | 'Hard') => void;
  onToggleStand: () => void;
  onBack: () => void;
  onNext: () => void;
  onScrollLock?: (locked: boolean) => void;
}

export function Stage3Preview3D({
  artworkUri,
  contour,
  edgeColorHex,
  moldStyle,
  heightCm,
  depthCm,
  smoothness,
  includeStand,
  onChangeMoldStyle,
  onChangeHeight,
  onChangeDepth,
  onChangeSmoothness,
  onToggleStand,
  onBack,
  onNext,
  onScrollLock,
}: Stage3Preview3DProps) {
  const webViewRef = useRef<any>(null);
  const [spin, setSpin] = useState(true);
  const [webLoaded, setWebLoaded] = useState(false);

  // Initial HTML built once per artworkUri so sliders update live via postMessage/injectJavaScript
  const initialHtml = useMemo(
    () =>
      buildThreeModelHtml({
        imageUri: artworkUri,
        contour,
        edgeColorHex,
        heightCm,
        depthCm,
        moldStyle,
        includeStand,
        spin: true,
      }),
    [artworkUri]
  );

  // Sync dynamic updates without reloading WebView
  useEffect(() => {
    if (!webLoaded) return;
    const payload = JSON.stringify({
      imageUri: artworkUri,
      contour,
      edgeColorHex,
      heightCm,
      depthCm,
      moldStyle,
      includeStand,
      spin,
    });
    webViewRef.current?.injectJavaScript(`window.updateFoldlyModel && window.updateFoldlyModel(${payload}); true;`);
  }, [webLoaded, artworkUri, contour, edgeColorHex, heightCm, depthCm, moldStyle, includeStand]);

  const toggleSpin = () => {
    const next = !spin;
    setSpin(next);
    webViewRef.current?.injectJavaScript(`window.setFoldlySpin && window.setFoldlySpin(${next}); true;`);
  };

  const flipBack = () => {
    webViewRef.current?.injectJavaScript(`window.flipFoldlyModel && window.flipFoldlyModel(); true;`);
  };

  const resetCam = () => {
    webViewRef.current?.injectJavaScript(`window.resetFoldlyCam && window.resetFoldlyCam(); true;`);
  };

  const gsm = heightCm >= 24 ? '220gsm' : '180gsm';
  const modeLabel = moldStyle === 'standee' ? '🪧 3D Standee' : '🧊 Crisp 3D';

  return (
    <View style={styles.container}>
      {/* Mold Style Switch */}
      <View style={styles.segRow}>
        {(
          [
            { key: 'block', label: '🧊 Crisp 3D' },
            { key: 'standee', label: '🪧 3D Standee' },
          ] as const
        ).map((m) => {
          const active = moldStyle === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              onPress={() => onChangeMoldStyle(m.key)}
              style={[styles.segBtn, active && styles.segBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Hardware-Accelerated Three.js WebView Viewport */}
      <View style={styles.viewportBox}>
        <NativeWebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: initialHtml }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          nestedScrollEnabled={false}
          onLoadEnd={() => setWebLoaded(true)}
          onMessage={(e: WebViewMessageEvent) => {
            try {
              const msg = JSON.parse(e.nativeEvent.data);
              if (msg.type === 'dragStart') onScrollLock?.(true);
              if (msg.type === 'dragEnd') onScrollLock?.(false);
            } catch {}
          }}
        />

        {/* Top-Left Model Badge */}
        <View style={styles.topPill} pointerEvents="none">
          <Text style={styles.topPillText}>
            {modeLabel} • {contour.length} pts
          </Text>
        </View>

        {/* 12cm Soda Can Scale Silhouette */}
        <View style={styles.canScaleWrap} pointerEvents="none">
          <Svg width={26} height={54} viewBox="0 0 36 74">
            <Rect
              x="4"
              y="6"
              width="28"
              height="62"
              rx="5"
              fill="none"
              stroke="#9db8af"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <SvgText
              x="18"
              y="42"
              textAnchor="middle"
              fill="#9db8af"
              fontSize="8.5"
              fontWeight="800"
            >
              12cm
            </SvgText>
          </Svg>
          <Text style={styles.canText}>12cm can</Text>
        </View>

        {/* Floating Liquid Glass 3D Controls */}
        <View style={styles.glassControls}>
          <TouchableOpacity
            onPress={toggleSpin}
            style={[styles.glassBtn, spin && styles.glassBtnOn]}
          >
            <Text style={[styles.glassBtnText, spin && styles.glassBtnTextOn]}>
              ⟳ Spin
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={flipBack} style={styles.glassBtn}>
            <Text style={styles.glassBtnText}>🔄 Front/Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetCam} style={styles.glassBtn}>
            <Text style={styles.glassBtnText}>↺ Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dimensions, Smoothness & Stand Controls */}
      <PaperSheet style={styles.controlsCard}>
        <CraftSlider
          label="Real Height"
          valueLabel={`${heightCm} cm`}
          value={heightCm}
          min={10}
          max={35}
          step={1}
          onChange={onChangeHeight}
          onSlidingChange={onScrollLock}
        />

        <CraftSlider
          label="3D Paper Depth"
          valueLabel={`${depthCm.toFixed(1)} cm`}
          value={depthCm}
          min={1.0}
          max={5.0}
          step={0.5}
          onChange={onChangeDepth}
          onSlidingChange={onScrollLock}
        />

        <View style={{ gap: 6 }}>
          <View style={styles.smoothTop}>
            <Text style={styles.controlLabel}>Cut Smoothness</Text>
            <Text style={styles.smoothMeta}>
              {contour.length} edges • {gsm} paper
            </Text>
          </View>
          <View style={styles.segRow}>
            {(
              [
                { key: 'Easy', label: '😊 Easy' },
                { key: 'Medium', label: '😎 Medium' },
                { key: 'Hard', label: '🚀 Hard' },
              ] as const
            ).map((s) => {
              const active = smoothness === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => onChangeSmoothness(s.key)}
                  style={[styles.segBtn, active && styles.segBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.controlLabel}>🪧 Include Fold-Out Desk Stand</Text>
          <TouchableOpacity
            onPress={onToggleStand}
            style={[styles.togglePill, includeStand && styles.togglePillOn]}
            activeOpacity={0.85}
          >
            <View style={[styles.toggleKnob, includeStand && styles.toggleKnobOn]} />
          </TouchableOpacity>
        </View>
      </PaperSheet>

      {/* Nav Controls */}
      <View style={styles.btnRow}>
        <CraftButton
          title="‹ Back"
          variant="alt"
          onPress={onBack}
          style={{ flex: 0.7 }}
        />
        <CraftButton
          title="Animate 3D → 2D Unfold →"
          variant="primary"
          onPress={onNext}
          style={{ flex: 1.6 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 11 },
  segRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#c8d3cf',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  segBtnActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  segBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
  },
  segBtnTextActive: {
    color: Colors.ruler,
  },
  viewportBox: {
    height: 255,
    borderRadius: 20,
    backgroundColor: '#0d1f1a',
    borderWidth: 2,
    borderColor: 'rgba(157, 184, 175, 0.35)',
    overflow: 'hidden',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0d1f1a',
  },
  topPill: {
    position: 'absolute',
    top: 9,
    left: 9,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 38, 32, 0.78)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  topPillText: {
    color: Colors.inkOnMat,
    fontSize: 10.5,
    fontWeight: '700',
  },
  canScaleWrap: {
    position: 'absolute',
    left: 10,
    bottom: 48,
    alignItems: 'center',
    opacity: 0.85,
  },
  canText: {
    fontSize: 9,
    color: Colors.sage,
    fontWeight: '700',
  },
  glassControls: {
    position: 'absolute',
    bottom: 9,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 38, 32, 0.82)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  glassBtn: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  glassBtnOn: {
    backgroundColor: Colors.ruler,
    borderColor: Colors.ink,
  },
  glassBtnText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
  },
  glassBtnTextOn: {
    color: Colors.ink,
  },
  controlsCard: {
    gap: 11,
  },
  smoothTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.ink,
  },
  smoothMeta: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  togglePill: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#cbd5e1',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    padding: 2,
    justifyContent: 'center',
  },
  togglePillOn: {
    backgroundColor: Colors.teal,
  },
  toggleKnob: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  toggleKnobOn: {
    transform: [{ translateX: 19 }],
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
