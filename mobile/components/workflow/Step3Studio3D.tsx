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
      {/* Bright Daylight Three.js Stage Inside Pure White Card */}
      <PaperSheet style={styles.stageCard}>
        <View style={styles.viewportInner}>
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

          {/* Floating White Frosted Spin / Reset Pills */}
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
      </PaperSheet>

      {/* Unfold Scrubber + Size & Stand Pills */}
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

      <CraftButton
        title="Printable PDF"
        variant="primary"
        onPress={onNext}
      />

      <CraftButton
        title="‹ Back to Cutout"
        variant="soft"
        small
        onPress={onBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  stageCard: {
    borderRadius: 28,
    padding: 10,
  },
  viewportInner: {
    height: 278,
    borderRadius: 20,
    backgroundColor: Colors.softSky,
    overflow: 'hidden',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.softSky,
  },
  glassControls: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: Colors.white,
    shadowColor: Colors.skyShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  glassBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.softSky,
  },
  glassBtnOn: {
    backgroundColor: Colors.black,
  },
  glassBtnText: {
    color: Colors.ink,
    fontSize: 11.5,
    fontWeight: '800',
  },
  glassBtnTextOn: {
    color: Colors.white,
  },
  controlsCard: {
    gap: 13,
  },
  compactStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.softSkyBorder,
  },
  sizeRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.softSky,
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: Colors.black,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
  },
  presetTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  standPill: {
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: Colors.softSky,
  },
  standPillOn: {
    backgroundColor: Colors.fold,
  },
  standText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.muted,
  },
  standTextOn: {
    color: Colors.white,
  },
});
