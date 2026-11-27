import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Colors } from '../../constants/theme';

const NativeWebView = WebView as unknown as React.ComponentType<any>;
import { PaperSheet } from '../PaperSheet';
import { CraftButton } from '../CraftButton';
import { CraftSlider } from '../CraftSlider';
import { buildUnfoldHtml } from '../../utils/threeHtml';

interface Stage4UnfoldProps {
  artworkUri: string;
  edgeColorHex: string;
  includeStand: boolean;
  unfoldProgress: number; // 0..100
  onChangeProgress: (pct: number) => void;
  onBack: () => void;
  onNext: () => void;
  onScrollLock?: (locked: boolean) => void;
}

export function Stage4Unfold({
  artworkUri,
  edgeColorHex,
  includeStand,
  unfoldProgress,
  onChangeProgress,
  onBack,
  onNext,
  onScrollLock,
}: Stage4UnfoldProps) {
  const webViewRef = useRef<any>(null);
  const [webLoaded, setWebLoaded] = useState(false);

  const initialHtml = useMemo(
    () =>
      buildUnfoldHtml({
        imageUri: artworkUri,
        edgeColorHex,
        includeStand,
        progress: unfoldProgress,
      }),
    [artworkUri]
  );

  useEffect(() => {
    if (!webLoaded) return;
    webViewRef.current?.injectJavaScript(
      `window.updateUnfoldConfig && window.updateUnfoldConfig(${JSON.stringify({
        edgeColorHex,
        includeStand,
        progress: unfoldProgress,
      })}); true;`
    );
  }, [webLoaded, unfoldProgress, edgeColorHex, includeStand]);

  const handleReplay = () => {
    webViewRef.current?.injectJavaScript(`window.replayUnfold && window.replayUnfold(); true;`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.viewportBox}>
        <NativeWebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: initialHtml }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          onLoadEnd={() => {
            setWebLoaded(true);
            webViewRef.current?.injectJavaScript(`window.replayUnfold && window.replayUnfold(); true;`);
          }}
          onMessage={(e: WebViewMessageEvent) => {
            try {
              const msg = JSON.parse(e.nativeEvent.data);
              if (msg.type === 'progress' && typeof msg.value === 'number') {
                onChangeProgress(msg.value);
              }
            } catch {}
          }}
        />

        <View style={styles.statusPill} pointerEvents="none">
          <Text style={styles.statusPillText}>
            {unfoldProgress > 92
              ? '✅ Flattened into Printable Paper Pieces!'
              : '📐 Unfolding Front, Back & Side Strip...'}
          </Text>
        </View>

        <View style={styles.glassControls}>
          <TouchableOpacity onPress={handleReplay} style={styles.glassBtn}>
            <Text style={styles.glassBtnText}>▶ Replay Unfold</Text>
          </TouchableOpacity>
        </View>
      </View>

      <PaperSheet style={styles.card}>
        <CraftSlider
          label="Folded 3D ↔ Flat Paper"
          valueLabel={`${Math.round(unfoldProgress)}%`}
          value={Math.round(unfoldProgress)}
          min={0}
          max={100}
          step={1}
          onChange={onChangeProgress}
          onSlidingChange={onScrollLock}
        />
        <Text style={styles.desc}>
          Watch how your <Text style={{ fontWeight: '800' }}>Front PNG</Text>,{' '}
          <Text style={{ fontWeight: '800' }}>Mirrored Back PNG</Text>, exact-perimeter{' '}
          <Text style={{ fontWeight: '800' }}>Side Depth Strip</Text>, and{' '}
          <Text style={{ fontWeight: '800' }}>Desk Stand</Text> flatten into printable paper pieces!
        </Text>
      </PaperSheet>

      <View style={styles.btnRow}>
        <CraftButton
          title="‹ Back"
          variant="alt"
          onPress={onBack}
          style={{ flex: 0.7 }}
        />
        <CraftButton
          title="Preview Printable Layout →"
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
  viewportBox: {
    height: 265,
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
  statusPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 38, 32, 0.8)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  statusPillText: {
    color: Colors.inkOnMat,
    fontSize: 10.5,
    fontWeight: '700',
  },
  glassControls: {
    position: 'absolute',
    bottom: 9,
    alignSelf: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 38, 32, 0.84)',
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
  glassBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    gap: 9,
  },
  desc: {
    fontSize: 11.5,
    color: '#4b5a55',
    lineHeight: 17,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
