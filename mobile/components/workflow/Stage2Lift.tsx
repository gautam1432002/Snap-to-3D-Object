import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, Pattern, Rect, SvgXml } from 'react-native-svg';
import { Colors } from '../../constants/theme';
import { PaperSheet } from '../PaperSheet';
import { CraftButton } from '../CraftButton';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';

interface Stage2LiftProps {
  originalPhotoUri: string | null;
  cutoutUri: string | null;
  sampleId: string | null;
  isRealPhoto: boolean;
  modelName: string;
  category: string;
  estMinutes: number;
  edgeColorHex: string;
  engineUsed: string;
  aiSource: string | null;
  aiWarning: string | null;
  solidity: number;
  sharpness: number;
  cropStatus: string;
  dieCutBorder: boolean;
  isProcessingUpload: boolean;
  uploadProgress: number;
  uploadProgressDesc: string;
  isPolishing: boolean;
  uploadError: string | null;
  onToggleDieCut: () => void;
  onRename: (newName: string) => void;
  onPolish: () => void;
  onRetryScan: () => void;
  onEditServerUrl: () => void;
  onBack: () => void;
  onNext: () => void;
  onScrollLock?: (locked: boolean) => void;
}

export function Stage2Lift({
  originalPhotoUri,
  cutoutUri,
  sampleId,
  isRealPhoto,
  modelName,
  category,
  estMinutes,
  edgeColorHex,
  engineUsed,
  aiSource,
  aiWarning,
  solidity,
  sharpness,
  cropStatus,
  dieCutBorder,
  isProcessingUpload,
  uploadProgress,
  uploadProgressDesc,
  isPolishing,
  uploadError,
  onToggleDieCut,
  onRename,
  onPolish,
  onRetryScan,
  onEditServerUrl,
  onBack,
  onNext,
  onScrollLock,
}: Stage2LiftProps) {
  const [splitActive, setSplitActive] = useState(false);
  const [splitPct, setSplitPct] = useState(50);
  const [boxWidth, setBoxWidth] = useState(320);
  const boxWidthRef = useRef(320);
  const boxLeftRef = useRef(0);
  const splitBoxRef = useRef<any>(null);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameText, setRenameText] = useState(modelName);

  const splitPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        onScrollLock?.(true);
        const px = e.nativeEvent.pageX;
        splitBoxRef.current?.measureInWindow((x: number) => {
          boxLeftRef.current = x;
          const pct = Math.max(5, Math.min(95, ((px - x) / Math.max(40, boxWidthRef.current)) * 100));
          setSplitPct(pct);
        });
      },
      onPanResponderMove: (e) => {
        const pct = Math.max(
          5,
          Math.min(95, ((e.nativeEvent.pageX - boxLeftRef.current) / Math.max(40, boxWidthRef.current)) * 100)
        );
        setSplitPct(pct);
      },
      onPanResponderRelease: () => onScrollLock?.(false),
      onPanResponderTerminate: () => onScrollLock?.(false),
    })
  ).current;

  const activeSample =
    !isRealPhoto && sampleId && SAMPLE_TEMPLATES[sampleId as keyof typeof SAMPLE_TEMPLATES]
      ? SAMPLE_TEMPLATES[sampleId as keyof typeof SAMPLE_TEMPLATES]
      : null;

  const renderArtwork = (dimmed: boolean) => {
    if (cutoutUri && !activeSample) {
      return (
        <Image
          source={{ uri: cutoutUri }}
          style={[
            styles.cutoutImg,
            dieCutBorder && !dimmed && styles.dieCutImageRing,
          ]}
          resizeMode="contain"
        />
      );
    }
    if (activeSample) {
      return (
        <View style={[dieCutBorder && !dimmed && styles.dieCutSvgWrap]}>
          <SvgXml xml={activeSample.svgMarkup} width={178} height={178} />
        </View>
      );
    }
    return <Text style={{ fontSize: 64 }}>✂️</Text>;
  };

  const onSplitLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setBoxWidth(w);
      boxWidthRef.current = w;
    }
  };

  return (
    <View style={styles.container}>
      {/* Checkerboard Viewport with Split Slider */}
      <View
        ref={splitBoxRef}
        onLayout={onSplitLayout}
        style={styles.viewportBox}
      >
        {/* Checkerboard Pattern */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <Pattern id="checker" width="18" height="18" patternUnits="userSpaceOnUse">
                <Rect x="0" y="0" width="9" height="9" fill="rgba(255,255,255,0.06)" />
                <Rect x="9" y="9" width="9" height="9" fill="rgba(255,255,255,0.06)" />
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="#142c25" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#checker)" />
          </Svg>
        </View>

        {/* Top Badges */}
        <View style={styles.topStatusPill}>
          <Text style={styles.topStatusText} numberOfLines={1}>
            {isProcessingUpload
              ? '🧠 Lifting subject edge-by-edge...'
              : uploadError
                ? '⚠️ Backend Upload Failed'
                : '✅ Subject Lifted! Fine-tune or build 3D'}
          </Text>
        </View>

        {!isProcessingUpload && !uploadError && (
          <View style={styles.engineBadge}>
            <Text style={styles.engineBadgeText}>⚡ {engineUsed}</Text>
          </View>
        )}

        {/* Main Content Area */}
        {isProcessingUpload ? (
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color={Colors.ruler} />
            <Text style={styles.processingText}>
              {uploadProgressDesc || 'Running background removal...'}
            </Text>
            <View style={styles.progTrack}>
              <View style={[styles.progFill, { width: `${Math.max(8, uploadProgress)}%` }]} />
            </View>
            <Text style={styles.processingSub}>{uploadProgress}% complete</Text>
          </View>
        ) : uploadError ? (
          <View style={styles.errorViewport}>
            <Text style={{ fontSize: 36 }}>📡</Text>
            <Text style={styles.errorTitle}>Could Not Lift Real Photo</Text>
            <Text style={styles.errorMsg}>{uploadError}</Text>
          </View>
        ) : splitActive && originalPhotoUri ? (
          <View style={StyleSheet.absoluteFill}>
            {/* Left Before Layer (Original) */}
            <View style={styles.centerLayer}>
              <Image
                source={{ uri: originalPhotoUri }}
                style={[styles.cutoutImg, { opacity: 0.72 }]}
                resizeMode="contain"
              />
            </View>
            {/* Right Clipped After Layer (Cutout) */}
            <View
              style={[
                styles.splitAfterClip,
                { left: `${splitPct}%` },
              ]}
            >
              <View
                style={[
                  styles.splitInnerFull,
                  { width: boxWidth, left: -((splitPct / 100) * boxWidth) },
                ]}
              >
                {renderArtwork(false)}
              </View>
            </View>
            {/* Draggable Handle */}
            <View
              {...splitPan.panHandlers}
              style={[styles.splitDivider, { left: `${splitPct}%` }]}
            >
              <View style={styles.splitHandle}>
                <Text style={styles.splitHandleText}>⇄</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.centerLayer}>{renderArtwork(false)}</View>
        )}

        {/* Bottom Glass Controls */}
        {!isProcessingUpload && !uploadError && (
          <View style={styles.glassControls}>
            {originalPhotoUri && (
              <TouchableOpacity
                onPress={() => setSplitActive((v) => !v)}
                style={[styles.glassBtn, splitActive && styles.glassBtnActive]}
              >
                <Text style={[styles.glassBtnText, splitActive && styles.glassBtnTextActive]}>
                  ⇄ Split Compare
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onToggleDieCut}
              style={[styles.glassBtn, dieCutBorder && styles.glassBtnActive]}
            >
              <Text style={[styles.glassBtnText, dieCutBorder && styles.glassBtnTextActive]}>
                ✂️ Die-Cut Edge
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Actionable Error Card (Real Photos Only — never fake Demo Mode) */}
      {uploadError && (
        <PaperSheet style={styles.errorCard}>
          <Text style={styles.errorCardTitle}>Real Photo Scan Failed</Text>
          <Text style={styles.errorCardDesc}>{uploadError}</Text>
          <View style={styles.btnRow}>
            <CraftButton
              title="🔄 Retry Scan"
              variant="primary"
              small
              onPress={onRetryScan}
              style={{ flex: 1 }}
            />
            <CraftButton
              title="⚙️ Edit Server IP"
              variant="paper"
              small
              onPress={onEditServerUrl}
              style={{ flex: 1 }}
            />
          </View>
        </PaperSheet>
      )}

      {/* Gemini Status Warning (only when GEMINI_API_KEY missing or fallback used) */}
      {isRealPhoto && aiSource === 'fallback' && aiWarning && !uploadError && (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>⚠️ {aiWarning}</Text>
        </View>
      )}

      {/* Solidity, Edge & Crop Inspector Card */}
      {!isProcessingUpload && !uploadError && (
        <View style={styles.diagCard}>
          <View style={styles.diagHead}>
            <Text style={styles.diagTitle}>📐 Solidity, Edge & Crop Inspector</Text>
            <View
              style={[
                styles.diagBadge,
                solidity >= 68 ? styles.pillOk : styles.pillWarn,
              ]}
            >
              <Text style={styles.diagBadgeText}>
                {solidity >= 68 ? 'Studio Solid ✓' : 'Polish Suggested'}
              </Text>
            </View>
          </View>

          <View style={styles.diagMetrics3}>
            <View style={[styles.diagPill, solidity >= 68 ? styles.pillBoxOk : styles.pillBoxWarn]}>
              <Text style={styles.diagLabel}>Solidity</Text>
              <Text style={styles.diagVal}>{solidity}%</Text>
            </View>
            <View style={[styles.diagPill, sharpness >= 50 ? styles.pillBoxOk : styles.pillBoxWarn]}>
              <Text style={styles.diagLabel}>Sharpness</Text>
              <Text style={styles.diagVal}>{sharpness}</Text>
            </View>
            <View style={[styles.diagPill, cropStatus.includes('Clean') ? styles.pillBoxOk : styles.pillBoxWarn]}>
              <Text style={styles.diagLabel}>Crop Check</Text>
              <Text style={styles.diagVal} numberOfLines={1}>{cropStatus}</Text>
            </View>
          </View>

          {isRealPhoto && (
            <CraftButton
              title={isPolishing ? '✨ Gemini Outpainting...' : '✨ Gemini Crisp Model Polish'}
              variant="teal"
              small
              loading={isPolishing}
              onPress={onPolish}
            />
          )}
        </View>
      )}

      {/* Result Paper Card: Name, Swatch, Rename & Die-Cut Toggle */}
      {!isProcessingUpload && !uploadError && (
        <PaperSheet style={styles.resultCard}>
          <View style={styles.resultTop}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.detName} numberOfLines={1}>
                  {modelName}
                </Text>
                <View style={[styles.swatch, { backgroundColor: edgeColorHex }]} />
              </View>
              <Text style={styles.detSub}>
                {category} • ~{estMinutes} mins • {engineUsed}
              </Text>
            </View>

            <CraftButton
              title="✏️ Rename"
              variant="paper"
              small
              onPress={() => {
                setRenameText(modelName);
                setRenameOpen((v) => !v);
              }}
            />
          </View>

          {renameOpen && (
            <View style={styles.renameRow}>
              <TextInput
                value={renameText}
                onChangeText={setRenameText}
                placeholder="Enter custom name..."
                placeholderTextColor="#94a3b8"
                style={styles.renameInput}
              />
              <CraftButton
                title="Save"
                small
                onPress={() => {
                  const trimmed = renameText.trim();
                  if (trimmed) onRename(trimmed);
                  setRenameOpen(false);
                }}
              />
            </View>
          )}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>✂️ Die-Cut White Paper Border</Text>
            <TouchableOpacity
              onPress={onToggleDieCut}
              style={[styles.togglePill, dieCutBorder && styles.togglePillOn]}
              activeOpacity={0.85}
            >
              <View style={[styles.toggleKnob, dieCutBorder && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>
        </PaperSheet>
      )}

      {/* Navigation Buttons */}
      <View style={styles.btnRow}>
        <CraftButton
          title="‹ Retake"
          variant="alt"
          onPress={onBack}
          style={{ flex: 0.75 }}
        />
        <CraftButton
          title="Build Crisp 3D Model →"
          variant="primary"
          disabled={isProcessingUpload || !!uploadError}
          onPress={onNext}
          style={{ flex: 1.5 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 11 },
  viewportBox: {
    height: 255,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(157, 184, 175, 0.35)',
    overflow: 'hidden',
    position: 'relative',
  },
  topStatusPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 38, 32, 0.82)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    maxWidth: '64%',
  },
  topStatusText: {
    color: Colors.inkOnMat,
    fontSize: 10.5,
    fontWeight: '700',
  },
  engineBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 99,
    backgroundColor: Colors.teal,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  engineBadgeText: {
    color: '#0b2420',
    fontSize: 10,
    fontWeight: '800',
  },
  centerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cutoutImg: {
    width: '84%',
    height: '82%',
  },
  dieCutImageRing: {
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dieCutSvgWrap: {
    padding: 8,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  splitAfterClip: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  splitInnerFull: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  splitDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    marginLeft: -1.5,
    backgroundColor: '#ffffff',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitHandle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.ruler,
    borderWidth: 2,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitHandleText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.ink,
  },
  glassControls: {
    position: 'absolute',
    bottom: 9,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 38, 32, 0.84)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    zIndex: 18,
  },
  glassBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  glassBtnActive: {
    backgroundColor: Colors.ruler,
    borderColor: Colors.ink,
  },
  glassBtnText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
  },
  glassBtnTextActive: {
    color: Colors.ink,
  },
  processingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  processingText: {
    color: Colors.inkOnMat,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  processingSub: {
    color: Colors.ruler,
    fontSize: 11.5,
    fontWeight: '700',
  },
  progTrack: {
    width: '78%',
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: Colors.teal,
  },
  errorViewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 6,
  },
  errorTitle: {
    color: Colors.cut,
    fontSize: 15,
    fontWeight: '800',
  },
  errorMsg: {
    color: Colors.inkOnMat,
    fontSize: 11.5,
    textAlign: 'center',
  },
  errorCard: {
    borderColor: Colors.cut,
    backgroundColor: '#fef2f2',
    gap: 8,
  },
  errorCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991b1b',
  },
  errorCardDesc: {
    fontSize: 12,
    color: '#7f1d1d',
    lineHeight: 17,
  },
  warnBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 9,
  },
  warnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#78350f',
    lineHeight: 16,
  },
  diagCard: {
    backgroundColor: 'rgba(16, 38, 32, 0.86)',
    borderWidth: 1.5,
    borderColor: 'rgba(157, 184, 175, 0.35)',
    borderRadius: 15,
    padding: 11,
    gap: 8,
  },
  diagHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diagTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.inkOnMat,
  },
  diagBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 99,
  },
  pillOk: { backgroundColor: Colors.easyBg },
  pillWarn: { backgroundColor: Colors.medBg },
  diagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.ink,
  },
  diagMetrics3: {
    flexDirection: 'row',
    gap: 6,
  },
  diagPill: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    padding: 7,
  },
  pillBoxOk: {
    borderColor: 'rgba(46, 196, 182, 0.55)',
    backgroundColor: 'rgba(46, 196, 182, 0.12)',
  },
  pillBoxWarn: {
    borderColor: 'rgba(244, 196, 48, 0.65)',
    backgroundColor: 'rgba(244, 196, 48, 0.12)',
  },
  diagLabel: {
    fontSize: 10,
    color: Colors.sage,
  },
  diagVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  resultCard: {
    gap: 10,
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.ink,
    flexShrink: 1,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  detSub: {
    fontSize: 11.5,
    color: '#4b5a55',
    marginTop: 2,
  },
  renameRow: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  renameInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5d1',
    backgroundColor: '#ffffff',
    color: Colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderTopColor: '#cbd5d1',
  },
  toggleLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.ink,
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
