import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Colors } from '../../constants/theme';
import { PaperSheet } from '../PaperSheet';
import { CraftButton } from '../CraftButton';
import { CraftSlider } from '../CraftSlider';
import { ContourPoint } from '../../utils/sampleTemplates';
import { buildStudio3DHtml } from '../../utils/threeHtml';

const NativeWebView = WebView as unknown as React.ComponentType<any>;

interface Step3Studio3DProps {
  artworkUri: string;
  contour: ContourPoint[];
  edgeColorHex: string;
  heightCm: number;
  depthCm: number;
  includeStand: boolean;
  onChangeHeight: (h: number) => void;
  onToggleStand: () => void;
  onBack: () => void;
  onNext: () => void;
  onScrollLock?: (locked: boolean) => void;
}

export function Step3Studio3D({
  artworkUri,
  contour,
  edgeColorHex,
  heightCm,
  depthCm,
  includeStand,
  onChangeHeight,
  onToggleStand,
  onBack,
  onNext,
  onScrollLock,
}: Step3Studio3DProps) {
  const webViewRef = useRef<any>(null);
  const [spin, setSpin] = useState(true);
  const [unfoldProgress, setUnfoldProgress] = useState(0);
  const [webLoaded, setWebLoaded] = useState(false);

  const initialHtml = useMemo(
    () =>
      buildStudio3DHtml({
        imageUri: artworkUri,
        contour,
        edgeColorHex,
        heightCm,
        depthCm,
        includeStand,
        unfoldProgress: 0,
        spin: true,
      }),
    [artworkUri]
  );

  useEffect(() => {
    if (!webLoaded) return;
    const payload = JSON.stringify({
      imageUri: artworkUri,
      contour,
      edgeColorHex,
      heightCm,
      depthCm,
      includeStand,
      unfoldProgress,
      spin,
    });
    webViewRef.current?.injectJavaScript(
      `window.updateStudio3D && window.updateStudio3D(${payload}); true;`
    );
  }, [webLoaded, artworkUri, contour, edgeColorHex, heightCm, depthCm, includeStand, unfoldProgress, spin]);

  const toggleSpin = () => {
    const next = !spin;
    setSpin(next);
    webViewRef.current?.injectJavaScript(
      `window.setStudioSpin && window.setStudioSpin(${next}); true;`
    );
  };

  const resetCam = () => {
    setUnfoldProgress(0);
    webViewRef.current?.injectJavaScript(`window.resetStudioCam && window.resetStudioCam(); true;`);
  };

  return (
    <View style={styles.container}>
      {/* Full-Width Sharp Three.js Viewport (3D Model + In-Place Unfold) */}
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

        {/* Minimal Spin / Reset Glass Pills */}
        <View style={styles.glassControls}>
          <TouchableOpacity
            onPress={toggleSpin}
            style={[styles.glassBtn, spin && styles.glassBtnOn]}
          >
            <Text style={[styles.glassBtnText, spin && styles.glassBtnTextOn]}>
              ⟳ Spin
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetCam} style={styles.glassBtn}>
            <Text style={styles.glassBtnText}>↺ Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Smooth Unfold Scrubber + Compact Size & Stand Controls */}
      <PaperSheet style={styles.controlsCard}>
        <CraftSlider
          label="Folded 3D ↔ Flat Paper"
          valueLabel={`${Math.round(unfoldProgress)}%`}
          value={Math.round(unfoldProgress)}
          min={0}
          max={100}
          step={1}
          onChange={setUnfoldProgress}
          onSlidingChange={onScrollLock}
        />

        <View style={styles.compactStrip}>
          {/* Size Presets: 12 cm / 18 cm / 24 cm */}
          <View style={styles.sizeRow}>
            {([12, 18, 24] as const).map((sz) => {
              const active = heightCm === sz;
              return (
                <TouchableOpacity
                  key={sz}
                  onPress={() => onChangeHeight(sz)}
                  style={[styles.presetBtn, active && styles.presetBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>
                    {sz} cm
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Stand On/Off Pill */}
          <TouchableOpacity
            onPress={onToggleStand}
            style={[styles.standPill, includeStand && styles.standPillOn]}
            activeOpacity={0.85}
          >
            <Text style={[styles.standText, includeStand && styles.standTextOn]}>
              {includeStand ? '🪧 Stand On' : 'Stand Off'}
            </Text>
          </TouchableOpacity>
        </View>
      </PaperSheet>

      {/* Navigation Footer */}
      <View style={styles.btnRow}>
        <CraftButton
          title="‹ Back"
          variant="alt"
          onPress={onBack}
          style={{ flex: 0.7 }}
        />
        <CraftButton
          title="Printable PDF →"
          variant="primary"
          onPress={onNext}
          style={{ flex: 1.6 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  viewportBox: {
    height: 280,
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
  glassControls: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 38, 32, 0.82)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  glassBtn: {
    paddingVertical: 5,
    paddingHorizontal: 11,
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
    fontSize: 11,
    fontWeight: '700',
  },
  glassBtnTextOn: {
    color: Colors.ink,
  },
  controlsCard: {
    gap: 12,
  },
  compactStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderTopColor: '#cbd5d1',
  },
  sizeRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#c8d3cf',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
  },
  presetTextActive: {
    color: Colors.ruler,
  },
  standPill: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#c8d3cf',
    backgroundColor: '#f1f5f9',
  },
  standPillOn: {
    backgroundColor: Colors.teal,
    borderColor: Colors.ink,
  },
  standText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.muted,
  },
  standTextOn: {
    color: '#0b2420',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 9,
  },
});
