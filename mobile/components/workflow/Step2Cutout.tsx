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
    liftScale.value = withSequence(
      withTiming(0.94, { duration: 40 }),
      withSpring(1.03, { damping: 11, stiffness: 240 }),
      withSpring(1.0, { damping: 16, stiffness: 180 })
    );
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
      {/* Pure White Cutout Stage Card with Soft Sky Checkerboard */}
      <PaperSheet style={styles.stageCard}>
        <View style={styles.viewportInner}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <Pattern id="checkerLight" width="18" height="18" patternUnits="userSpaceOnUse">
                  <Rect x="0" y="0" width="9" height="9" fill="#E6F3FF" />
                  <Rect x="9" y="9" width="9" height="9" fill="#E6F3FF" />
                </Pattern>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="#F6FBFF" />
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#checkerLight)" />
            </Svg>
          </View>

          {isProcessingUpload ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={Colors.fold} />
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
                    'rgba(255,255,255,0.65)',
                    'rgba(79,195,255,0.22)',
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
      </PaperSheet>

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
              variant="soft"
              small
              onPress={onEditServerUrl}
              style={{ flex: 1 }}
            />
          </View>
        </PaperSheet>
      )}

      {isRealPhoto && aiSource === 'fallback' && aiWarning && !uploadError && (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>⚠️ {aiWarning}</Text>
        </View>
      )}

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
        </PaperSheet>
      )}

      {/* Actions */}
      <CraftButton
        title="Preview in Crisp 3D"
        variant="primary"
        disabled={isProcessingUpload || !!uploadError}
        onPress={onNext}
      />

      <View style={styles.btnRow}>
        <CraftButton
          title="↺ Retake"
          variant="soft"
          small
          onPress={onRetake}
          style={{ flex: 0.85 }}
        />
        {isRealPhoto && !isProcessingUpload && !uploadError && (
          <CraftButton
            title={isPolishing ? 'Polishing...' : '✨ AI Edge Polish'}
            variant="soft"
            small
            loading={isPolishing}
            onPress={onPolish}
            style={{ flex: 1.3 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  stageCard: {
    borderRadius: 28,
    padding: 12,
  },
  viewportInner: {
    height: 256,
    borderRadius: 20,
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
    color: Colors.ink,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  progTrack: {
    width: '76%',
    height: 7,
    borderRadius: 99,
    backgroundColor: '#DBEAFE',
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: Colors.fold,
  },
  progressPct: {
    color: Colors.fold,
    fontSize: 12,
    fontWeight: '800',
  },
  errorTitle: {
    color: Colors.dangerText,
    fontSize: 15,
    fontWeight: '800',
  },
  errorDesc: {
    color: Colors.muted,
    fontSize: 11.5,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FFF1F2',
    gap: 9,
  },
  errorCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dangerText,
  },
  errorCardBody: {
    fontSize: 12,
    color: '#9F1239',
    lineHeight: 17,
  },
  warnBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 10,
  },
  warnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 16,
  },
  nameCard: {
    gap: 7,
    padding: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.muted,
  },
  nameInput: {
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.softSkyBorder,
    backgroundColor: Colors.softSky,
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 9,
  },
});
