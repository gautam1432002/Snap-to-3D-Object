import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';
import { Colors, Radii, Spacing } from '../../constants/theme';
import { BentoCard } from '../BentoCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Stage4UnfoldProps {
  unfoldProgress: number;
  selectedSampleId: string | null;
  onChangeProgress: (progress: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Stage4Unfold({
  unfoldProgress,
  selectedSampleId,
  onChangeProgress,
  onBack,
  onNext,
}: Stage4UnfoldProps) {
  const sampleEmoji =
    selectedSampleId === 'crossing'
      ? '🚸'
      : selectedSampleId === 'sneaker'
      ? '👟'
      : selectedSampleId === 'fox'
      ? '🦊'
      : '🧋';

  return (
    <View style={styles.container}>
      <BentoCard title="Unfold 3D → 2D Pieces" subtitle="Scrub slider to watch flat pack unfold">
        <View style={styles.svg3dCanvas}>
          <Svg width={SCREEN_WIDTH - 64} height={240} viewBox="0 0 300 240">
            {/* Front Silhouette (moves left as unfold progresses) */}
            <G transform={`translate(${150 - unfoldProgress * 70}, ${100 - unfoldProgress * 30})`}>
              <Rect
                x="-35"
                y="-35"
                width="70"
                height="70"
                rx="4"
                fill="#FDFDFB"
                stroke="#E63946"
                strokeWidth="1.5"
              />
              <SvgText x="0" y="8" fontSize="28" textAnchor="middle">
                {sampleEmoji}
              </SvgText>
            </G>

            {/* Mirrored Back Silhouette (moves right as unfold progresses) */}
            <G transform={`translate(${150 + unfoldProgress * 70}, ${100 - unfoldProgress * 30})`}>
              <Rect
                x="-35"
                y="-35"
                width="70"
                height="70"
                rx="4"
                fill="#FDFDFB"
                stroke="#E63946"
                strokeWidth="1.5"
              />
              <SvgText x="0" y="8" fontSize="28" textAnchor="middle" opacity="0.6">
                {sampleEmoji}
              </SvgText>
            </G>

            {/* Side Gusset Depth Strip (moves down as unfold progresses) */}
            <G transform={`translate(150, ${145 + unfoldProgress * 35})`}>
              <Rect
                x="-110"
                y="-12"
                width="220"
                height="24"
                rx="2"
                fill="#FDE7E9"
                stroke="#3B78F0"
                strokeWidth="1.5"
                strokeDasharray="4, 4"
              />
              <SvgText x="0" y="4" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">
                EXACT PERIMETER SIDE STRIP
              </SvgText>
            </G>
          </Svg>
        </View>

        {/* Scrub Slider */}
        <View style={styles.scrubSection}>
          <View style={styles.scrubHeader}>
            <Text style={styles.scrubLabel}>
              Unfold Progress: {Math.round(unfoldProgress * 100)}%
            </Text>
            <TouchableOpacity
              onPress={() => onChangeProgress(unfoldProgress >= 1 ? 0 : 1)}
              style={styles.toggleAnimBtn}
            >
              <Text style={styles.toggleAnimText}>
                {unfoldProgress >= 1 ? 'Fold 3D' : 'Unfold 2D'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Step Pill Selector */}
          <View style={styles.unfoldPillsRow}>
            {[0, 0.25, 0.5, 0.75, 1].map((step) => (
              <TouchableOpacity
                key={step}
                onPress={() => onChangeProgress(step)}
                style={[
                  styles.unfoldStepPill,
                  Math.abs(unfoldProgress - step) < 0.1 && styles.unfoldStepPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.unfoldStepPillText,
                    Math.abs(unfoldProgress - step) < 0.1 && styles.unfoldStepPillTextActive,
                  ]}
                >
                  {Math.round(step * 100)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </BentoCard>

      {/* Nav Controls */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={onBack} style={styles.navBackBtn}>
          <ArrowLeft size={18} color={Colors.muted} />
          <Text style={styles.navBackText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext} style={styles.navNextBtn}>
          <LinearGradient colors={[Colors.ruler, '#D4A017']} style={styles.navNextGrad}>
            <Text style={styles.btnPrimaryText}>Generate Print PDF</Text>
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
  svg3dCanvas: {
    height: 240,
    backgroundColor: '#0F1614',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  scrubSection: {
    gap: Spacing.sm,
  },
  scrubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scrubLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  toggleAnimBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  toggleAnimText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ruler,
  },
  unfoldPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  unfoldStepPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  unfoldStepPillActive: {
    borderColor: Colors.ruler,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
  },
  unfoldStepPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
  },
  unfoldStepPillTextActive: {
    color: Colors.ruler,
    fontWeight: '800',
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
