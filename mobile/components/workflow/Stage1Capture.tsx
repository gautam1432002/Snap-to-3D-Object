import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Image as ImageIcon, ArrowRight } from 'lucide-react-native';
import { Colors, Radii, Spacing, Typography } from '../../constants/theme';
import { CreationItem } from '../../services/storage';
import { DEMO_SAMPLES } from '../../services/api';

interface Stage1CaptureProps {
  capturedUri: string | null;
  selectedSampleId: string | null;
  modelName: string;
  category: string;
  onTakePhoto: () => void;
  onPickGallery: () => void;
  onSelectSample: (sample: CreationItem) => void;
  onConfirm: () => void;
}

export function Stage1Capture({
  capturedUri,
  selectedSampleId,
  modelName,
  category,
  onTakePhoto,
  onPickGallery,
  onSelectSample,
  onConfirm,
}: Stage1CaptureProps) {
  return (
    <View style={styles.container}>
      {/* Viewfinder Target Area */}
      <View style={styles.captureFrame}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {capturedUri ? (
          <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
        ) : selectedSampleId ? (
          <View style={styles.sampleDisplay}>
            <Text style={{ fontSize: 72 }}>
              {selectedSampleId === 'crossing'
                ? '🚸'
                : selectedSampleId === 'sneaker'
                ? '👟'
                : selectedSampleId === 'fox'
                ? '🦊'
                : '🧋'}
            </Text>
            <Text style={styles.sampleDisplayName}>{modelName}</Text>
            <Text style={styles.sampleDisplayCategory}>{category} • 180 gsm</Text>
          </View>
        ) : (
          <View style={styles.emptyCaptureNotice}>
            <Camera size={44} color={Colors.ruler} strokeWidth={1.5} />
            <Text style={styles.captureInstructions}>
              Position subject in good lighting against a plain background
            </Text>
          </View>
        )}
      </View>

      {/* Quick-Pick Samples */}
      <Text style={styles.sectionLabel}>Or Pick a Ready-Made Template</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.samplePickerRow}
      >
        {DEMO_SAMPLES.map((s) => (
          <TouchableOpacity
            key={s.id}
            onPress={() => onSelectSample(s)}
            style={[
              styles.sampleChip,
              selectedSampleId === s.sampleId && styles.sampleChipActive,
            ]}
          >
            <Text style={{ fontSize: 20 }}>
              {s.sampleId === 'crossing'
                ? '🚸'
                : s.sampleId === 'sneaker'
                ? '👟'
                : s.sampleId === 'fox'
                ? '🦊'
                : '🧋'}
            </Text>
            <Text style={styles.sampleChipText}>{s.name.split(' ')[0]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={onTakePhoto} style={styles.btnSecondary}>
          <Camera size={18} color={Colors.ink} />
          <Text style={styles.btnSecondaryText}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onPickGallery} style={styles.btnSecondary}>
          <ImageIcon size={18} color={Colors.ink} />
          <Text style={styles.btnSecondaryText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onConfirm} style={styles.btnPrimary}>
        <LinearGradient colors={[Colors.ruler, '#D4A017']} style={styles.btnGradient}>
          <Text style={styles.btnPrimaryText}>Confirm & Lift Subject</Text>
          <ArrowRight size={18} color="#0D1210" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  captureFrame: {
    height: 280,
    backgroundColor: '#0F1614',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  sampleDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleDisplayName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: 12,
  },
  sampleDisplayCategory: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 4,
  },
  emptyCaptureNotice: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  captureInstructions: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.ruler,
  },
  cornerTL: { top: 14, left: 14, borderTopWidth: 2.5, borderLeftWidth: 2.5 },
  cornerTR: { top: 14, right: 14, borderTopWidth: 2.5, borderRightWidth: 2.5 },
  cornerBL: { bottom: 14, left: 14, borderBottomWidth: 2.5, borderLeftWidth: 2.5 },
  cornerBR: { bottom: 14, right: 14, borderBottomWidth: 2.5, borderRightWidth: 2.5 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  samplePickerRow: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sampleChipActive: {
    borderColor: Colors.ruler,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  sampleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
  },
  btnPrimary: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  btnGradient: {
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
