import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RotateCw, Layers, ArrowLeft, ArrowRight } from 'lucide-react-native';
import Svg, {
  Rect,
  Polygon,
  G,
  Text as SvgText,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';
import { Colors, Radii, Spacing } from '../../constants/theme';
import { BentoCard } from '../BentoCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Stage3Preview3DProps {
  rotationAngle: number;
  panResponderHandlers: any;
  selectedSampleId: string | null;
  moldStyle: 'block' | 'standee';
  heightCm: number;
  depthCm: number;
  edgeColorHex: string;
  onChangeMoldStyle: (style: 'block' | 'standee') => void;
  onChangeHeight: (updater: (prev: number) => number) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Stage3Preview3D({
  rotationAngle,
  panResponderHandlers,
  selectedSampleId,
  moldStyle,
  heightCm,
  depthCm,
  edgeColorHex,
  onChangeMoldStyle,
  onChangeHeight,
  onBack,
  onNext,
}: Stage3Preview3DProps) {
  const rad = (rotationAngle * Math.PI) / 180;
  const offsetX = Math.cos(rad) * 12;

  return (
    <View style={styles.container}>
      <BentoCard title="Crisp 3D Paper Model" subtitle="Drag horizontally to spin 360°">
        <View {...panResponderHandlers} style={styles.svg3dCanvas}>
          <Svg width={SCREEN_WIDTH - 64} height={240} viewBox="0 0 300 240">
            <Defs>
              <SvgGradient id="matGrid" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#1B3A31" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#102620" stopOpacity="0.9" />
              </SvgGradient>
            </Defs>

            {/* Turntable Cutting Mat Disc */}
            <Polygon
              points="70,185 230,185 270,215 30,215"
              fill="url(#matGrid)"
              stroke="#25493E"
              strokeWidth="1.5"
            />

            {/* 3D Model Group */}
            <G transform="translate(150, 110)">
              {/* Fold-Out Stand Base */}
              <Rect
                x="-44"
                y="48"
                width="88"
                height="12"
                rx="3"
                fill="#FDFDFB"
                stroke="#CCC"
                strokeWidth="1"
              />

              {/* Extruded Prism Side Wall */}
              <Polygon
                points={`
                  ${-45 + offsetX},${-45}
                  ${45 + offsetX},${-45}
                  ${45 + offsetX},${45}
                  ${-45 + offsetX},${45}
                `}
                fill={edgeColorHex}
                opacity={0.88}
              />

              {/* Front Face Silhouette Card */}
              <Rect
                x="-45"
                y="-45"
                width="90"
                height="90"
                rx="6"
                fill="#FDFDFB"
                stroke={edgeColorHex}
                strokeWidth="2"
              />

              <SvgText x="0" y="14" fontSize="44" textAnchor="middle">
                {selectedSampleId === 'crossing'
                  ? '🚸'
                  : selectedSampleId === 'sneaker'
                  ? '👟'
                  : selectedSampleId === 'fox'
                  ? '🦊'
                  : '🧋'}
              </SvgText>
            </G>
          </Svg>

          <View style={styles.rotationHintPill}>
            <RotateCw size={12} color={Colors.ruler} />
            <Text style={styles.rotationHintText}>Angle: {Math.round(rotationAngle)}°</Text>
          </View>
        </View>

        {/* Parametric Mold Controls */}
        <View style={styles.controlsSection}>
          <View style={styles.moldTypeRow}>
            <TouchableOpacity
              onPress={() => onChangeMoldStyle('block')}
              style={[styles.moldBtn, moldStyle === 'block' && styles.moldBtnActive]}
            >
              <Text style={[styles.moldBtnText, moldStyle === 'block' && styles.moldBtnTextActive]}>
                🧊 Crisp 3D ({depthCm} cm)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onChangeMoldStyle('standee')}
              style={[styles.moldBtn, moldStyle === 'standee' && styles.moldBtnActive]}
            >
              <Text style={[styles.moldBtnText, moldStyle === 'standee' && styles.moldBtnTextActive]}>
                🪧 3D Standee (1 cm)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Height Adjuster */}
          <View style={styles.adjusterRow}>
            <Text style={styles.adjusterLabel}>Model Height: {heightCm} cm</Text>
            <View style={styles.stepperBox}>
              <TouchableOpacity
                onPress={() => onChangeHeight((h) => Math.max(12, h - 2))}
                style={styles.stepMiniBtn}
              >
                <Text style={styles.stepMiniText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepVal}>{heightCm}</Text>
              <TouchableOpacity
                onPress={() => onChangeHeight((h) => Math.min(26, h + 2))}
                style={styles.stepMiniBtn}
              >
                <Text style={styles.stepMiniText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.gsmChip}>
            <Layers size={14} color={Colors.teal} />
            <Text style={styles.gsmChipText}>
              {heightCm >= 24 ? 'Recommended: 220 gsm Cardstock' : 'Recommended: 180 gsm Cardstock'}
            </Text>
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
            <Text style={styles.btnPrimaryText}>Animate Unfold</Text>
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
    position: 'relative',
  },
  rotationHintPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  rotationHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ruler,
  },
  controlsSection: {
    gap: Spacing.sm,
  },
  moldTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  moldBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  moldBtnActive: {
    borderColor: Colors.ruler,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  moldBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
  },
  moldBtnTextActive: {
    color: Colors.ruler,
    fontWeight: '800',
  },
  adjusterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  adjusterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: Radii.sm,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepMiniBtn: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMiniText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  stepVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.ink,
    minWidth: 24,
    textAlign: 'center',
  },
  gsmChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    marginTop: 4,
  },
  gsmChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.teal,
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
