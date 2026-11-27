import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { Colors, Radii, Spacing } from '../../constants/theme';
import { BentoCard } from '../BentoCard';

interface Stage2LiftProps {
  cutoutUri: string | null;
  selectedSampleId: string | null;
  solidity: number;
  sharpness: number;
  cropStatus: string;
  isPolishing: boolean;
  isProcessingUpload: boolean;
  uploadProgressDesc: string;
  onPolish: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function Stage2Lift({
  cutoutUri,
  selectedSampleId,
  solidity,
  sharpness,
  cropStatus,
  isPolishing,
  isProcessingUpload,
  uploadProgressDesc,
  onPolish,
  onBack,
  onNext,
}: Stage2LiftProps) {
  return (
    <View style={styles.container}>
      <BentoCard title="Neural Subject Lift" subtitle="Clean background isolation & polygon metrics">
        {/* Cutout Display with Checkerboard */}
        <View style={styles.cutoutCheckerboard}>
          {isProcessingUpload ? (
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color={Colors.ruler} />
              <Text style={styles.processingText}>{uploadProgressDesc || 'Isolating subject...'}</Text>
              <Text style={styles.processingSub}>Downloading neural model on first run (takes ~30s)</Text>
            </View>
          ) : cutoutUri ? (
            <Image source={{ uri: cutoutUri }} style={styles.cutoutImg} resizeMode="contain" />
          ) : (
            <View style={styles.cutoutPlaceholder}>
              <Text style={{ fontSize: 80 }}>
                {selectedSampleId === 'crossing'
                  ? '🚸'
                  : selectedSampleId === 'sneaker'
                  ? '👟'
                  : selectedSampleId === 'fox'
                  ? '🦊'
                  : '🧋'}
              </Text>
            </View>
          )}
        </View>

        {/* Quality Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{solidity}%</Text>
            <Text style={styles.metricLabel}>Solidity</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{sharpness}</Text>
            <Text style={styles.metricLabel}>Edge Crisp</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { fontSize: 13 }]}>{cropStatus}</Text>
            <Text style={styles.metricLabel}>Crop Status</Text>
          </View>
        </View>

        {/* Polish Button */}
        <TouchableOpacity
          onPress={onPolish}
          disabled={isPolishing || isProcessingUpload}
          style={[styles.polishBtn, (isPolishing || isProcessingUpload) && { opacity: 0.6 }]}
        >
          <Sparkles size={16} color={Colors.ruler} />
          <Text style={styles.polishBtnText}>
            {isPolishing ? 'Outpainting...' : '✨ AI Edge Polish (Gemini 3.1)'}
          </Text>
        </TouchableOpacity>
      </BentoCard>

      {/* Nav Controls */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={onBack} style={styles.navBackBtn}>
          <ArrowLeft size={18} color={Colors.muted} />
          <Text style={styles.navBackText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext} disabled={isProcessingUpload} style={styles.navNextBtn}>
          <LinearGradient colors={[Colors.ruler, '#D4A017']} style={styles.navNextGrad}>
            <Text style={styles.btnPrimaryText}>Inspect 3D Model</Text>
            <ArrowRight size={18} color="#0D1210" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  cutoutCheckerboard: {
    height: 240,
    backgroundColor: '#141E1B',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  processingBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  processingText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: 14,
    textAlign: 'center',
  },
  processingSub: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  cutoutImg: {
    width: '90%',
    height: '90%',
  },
  cutoutPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metricItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: Radii.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ruler,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 4,
  },
  polishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  polishBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ruler,
  },
  navRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    height: 52,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  navBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.muted,
  },
  navNextBtn: {
    flex: 1,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  navNextGrad: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D1210',
  },
});
