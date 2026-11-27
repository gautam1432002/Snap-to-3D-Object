import React, { useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import Svg, { Defs, Pattern, Rect, SvgXml } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { PaperSheet } from '../PaperSheet';
import { CraftButton } from '../CraftButton';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';

interface Step2CutoutProps {
  cutoutUri: string | null;
  sampleId: string | null;
  isRealPhoto: boolean;
  modelName: string;
  aiSource: string | null;
  aiWarning: string | null;
  isProcessingUpload: boolean;
  uploadProgress: number;
  uploadProgressDesc: string;
  isPolishing: boolean;
  uploadError: string | null;
  onChangeName: (name: string) => void;
  onPolish: () => void;
  onRetryScan: () => void;
  onEditServerUrl: () => void;
  onRetake: () => void;
  onNext: () => void;
}

export function Step2Cutout({
  cutoutUri,
  sampleId,
  isRealPhoto,
  modelName,
  aiSource,
  aiWarning,
  isProcessingUpload,
  uploadProgress,
  uploadProgressDesc,
  isPolishing,
  uploadError,
  onChangeName,
  onPolish,
  onRetryScan,
  onEditServerUrl,
  onRetake,
  onNext,
}: Step2CutoutProps) {
  const activeSample =
    !isRealPhoto && sampleId && SAMPLE_TEMPLATES[sampleId as keyof typeof SAMPLE_TEMPLATES]
      ? SAMPLE_TEMPLATES[sampleId as keyof typeof SAMPLE_TEMPLATES]
      : null;

  const liftScale = useSharedValue(1);
  const shimmerX = useSharedValue(-220);

  const isReady = !isProcessingUpload && !uploadError && (!!cutoutUri || !!activeSample);

  useEffect(() => {
    if (!isReady) return;
    // Subject Lift pop: 0.94 -> 1.03 -> 1.0
    liftScale.value = withSequence(
      withTiming(0.94, { duration: 40 }),
      withSpring(1.03, { damping: 11, stiffness: 240 }),
      withSpring(1.0, { damping: 16, stiffness: 180 })
    );
    // Diagonal light shimmer sweep
    shimmerX.value = -220;
    shimmerX.value = withTiming(420, {
      duration: 680,
      easing: Easing.out(Easing.cubic),
    });
  }, [isReady, cutoutUri]);

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ scale: liftScale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { rotate: '22deg' }],
  }));

  return (
    <View style={styles.container}>
      {/* Clean Checkerboard Cutout Preview */}
      <View style={styles.viewportBox}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <Pattern id="checker2" width="18" height="18" patternUnits="userSpaceOnUse">
                <Rect x="0" y="0" width="9" height="9" fill="rgba(255,255,255,0.06)" />
                <Rect x="9" y="9" width="9" height="9" fill="rgba(255,255,255,0.06)" />
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="#142c25" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#checker2)" />
          </Svg>
        </View>

        {isProcessingUpload ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.ruler} />
            <Text style={styles.progressText}>
              {uploadProgressDesc || 'Lifting crisp cutout...'}
            </Text>
            <View style={styles.progTrack}>
              <View style={[styles.progFill, { width: `${Math.max(8, uploadProgress)}%` }]} />
            </View>
            <Text style={styles.progressPct}>{uploadProgress}%</Text>
          </View>
        ) : uploadError ? (
          <View style={styles.centerBox}>
            <Text style={{ fontSize: 36 }}>📡</Text>
            <Text style={styles.errorTitle}>Scan Failed</Text>
            <Text style={styles.errorDesc}>{uploadError}</Text>
          </View>
        ) : (
          <Animated.View style={[styles.centerBox, liftStyle]}>
            {cutoutUri && !activeSample ? (
              <Image
                source={{ uri: cutoutUri }}
                style={styles.cutoutImg}
                resizeMode="contain"
              />
            ) : activeSample ? (
              <SvgXml xml={activeSample.svgMarkup} width={185} height={185} />
            ) : null}
          </Animated.View>
        )}

        {/* Diagonal Light Shimmer Sweep Overlay */}
        {isReady && (
          <View pointerEvents="none" style={styles.shimmerClip}>
            <Animated.View style={[styles.shimmerBeam, shimmerStyle]}>
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0)',
                  'rgba(255,255,255,0.45)',
                  'rgba(46,196,182,0.22)',
                  'rgba(255,255,255,0)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        )}
      </View>

      {/* Actionable Error Card (never fakes Demo Mode on real photo) */}
      {uploadError && (
        <PaperSheet style={styles.errorCard}>
          <Text style={styles.errorCardTitle}>Could Not Reach Backend Server</Text>
          <Text style={styles.errorCardBody}>{uploadError}</Text>
          <View style={styles.btnRow}>
            <CraftButton
              title="🔄 Retry"
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

      {/* Gemini Fallback Warning (only if API key missing / fallback used) */}
      {isRealPhoto && aiSource === 'fallback' && aiWarning && !uploadError && (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>⚠️ {aiWarning}</Text>
        </View>
      )}

      {/* Clean Object Name & Optional AI Polish Card */}
      {!isProcessingUpload && !uploadError && (
        <PaperSheet style={styles.nameCard}>
          <Text style={styles.fieldLabel}>Object Name</Text>
          <TextInput
            value={modelName}
            onChangeText={onChangeName}
            placeholder="Name your paper craft..."
            placeholderTextColor="#94a3b8"
            style={styles.nameInput}
          />

          {isRealPhoto && (
            <CraftButton
              title={isPolishing ? 'Polishing with AI...' : '✨ AI Polish'}
              variant="teal"
              small
              loading={isPolishing}
              onPress={onPolish}
            />
          )}
        </PaperSheet>
      )}

      {/* Primary Footer Row */}
      <View style={styles.btnRow}>
        <CraftButton
          title="↺ Retake"
          variant="alt"
          onPress={onRetake}
          style={{ flex: 0.75 }}
        />
        <CraftButton
          title="Preview in 3D →"
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
  container: { gap: 12 },
  viewportBox: {
    height: 265,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(157, 184, 175, 0.35)',
    overflow: 'hidden',
    position: 'relative',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  cutoutImg: {
    width: '90%',
    height: '90%',
  },
  shimmerClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  shimmerBeam: {
    position: 'absolute',
    top: -60,
    bottom: -60,
    width: 96,
  },
  progressText: {
    color: Colors.inkOnMat,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  progTrack: {
    width: '76%',
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: Colors.teal,
  },
  progressPct: {
    color: Colors.ruler,
    fontSize: 11.5,
    fontWeight: '800',
  },
  errorTitle: {
    color: Colors.cut,
    fontSize: 15,
    fontWeight: '800',
  },
  errorDesc: {
    color: Colors.inkOnMat,
    fontSize: 11.5,
    textAlign: 'center',
  },
  errorCard: {
    borderColor: Colors.cut,
    backgroundColor: '#fef2f2',
    gap: 9,
  },
  errorCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991b1b',
  },
  errorCardBody: {
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
  nameCard: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.muted,
  },
  nameInput: {
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#cbd5d1',
    backgroundColor: '#ffffff',
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 9,
  },
});
