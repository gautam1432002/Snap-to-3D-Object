import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { PaperSheet } from '../PaperSheet';
import { CraftButton } from '../CraftButton';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';

interface Step1SnapProps {
  capturedUri: string | null;
  selectedSampleId: string | null;
  modelName: string;
  onTakePhoto: () => void;
  onPickGallery: () => void;
  onSelectSample: (sampleId: 'crossing' | 'sneaker' | 'fox' | 'boba') => void;
  onRetake: () => void;
  onConfirm: () => void;
}

export function Step1Snap({
  capturedUri,
  selectedSampleId,
  modelName,
  onTakePhoto,
  onPickGallery,
  onSelectSample,
  onRetake,
  onConfirm,
}: Step1SnapProps) {
  const activeSample =
    selectedSampleId && SAMPLE_TEMPLATES[selectedSampleId as keyof typeof SAMPLE_TEMPLATES]
      ? SAMPLE_TEMPLATES[selectedSampleId as keyof typeof SAMPLE_TEMPLATES]
      : SAMPLE_TEMPLATES.crossing;

  return (
    <View style={styles.container}>
      {/* Bright White Sunlit Viewfinder Stage Card */}
      <PaperSheet style={styles.stageCard}>
        <View style={styles.viewportInner}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {capturedUri ? (
            <Image
              source={{ uri: capturedUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.sampleWrap}>
              <SvgXml xml={activeSample.svgMarkup} width={178} height={178} />
              <View style={styles.samplePill}>
                <Text style={styles.sampleLabel}>
                  Sample: {modelName || activeSample.name}
                </Text>
              </View>
            </View>
          )}
        </View>
      </PaperSheet>

      {capturedUri ? (
        <View style={styles.controlsBox}>
          <CraftButton
            title="Lift Subject Cutout"
            variant="primary"
            onPress={onConfirm}
          />
          <CraftButton
            title="↺ Retake Photo"
            variant="soft"
            small
            onPress={onRetake}
          />
        </View>
      ) : (
        <View style={styles.controlsBox}>
          <CraftButton
            title="Take Photo & Lift"
            variant="primary"
            icon={<Camera size={18} color={Colors.white} strokeWidth={2.3} />}
            onPress={onTakePhoto}
          />
          <CraftButton
            title="Choose from Gallery"
            variant="soft"
            icon={<ImageIcon size={18} color={Colors.ink} strokeWidth={2.2} />}
            onPress={onPickGallery}
          />

          <PaperSheet style={styles.sampleBox}>
            <Text style={styles.sampleHead}>Or pick an instant sample:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {(
                [
                  { id: 'crossing', label: '🚸 Crossing' },
                  { id: 'sneaker', label: '👟 Sneaker' },
                  { id: 'fox', label: '🦊 Fox' },
                  { id: 'boba', label: '🧋 Boba' },
                ] as const
              ).map((item) => {
                const active = (selectedSampleId || 'crossing') === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => onSelectSample(item.id)}
                    style={[styles.chip, active && styles.chipActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </PaperSheet>

          <CraftButton
            title={`Craft "${activeSample.shortName}" Sample`}
            variant="teal"
            onPress={onConfirm}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 13 },
  stageCard: {
    borderRadius: 28,
    padding: 12,
  },
  viewportInner: {
    height: 252,
    borderRadius: 20,
    backgroundColor: Colors.softSky,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 3.5,
    borderColor: Colors.fold,
    borderRadius: 5,
    zIndex: 6,
  },
  cornerTL: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0 },
  previewImage: {
    width: '92%',
    height: '88%',
  },
  sampleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  samplePill: {
    backgroundColor: Colors.white,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  sampleLabel: {
    color: Colors.ink,
    fontSize: 11.5,
    fontWeight: '800',
  },
  controlsBox: { gap: 10 },
  sampleBox: {
    padding: 13,
    gap: 9,
  },
  sampleHead: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  chipRow: { gap: 8 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: Colors.softSky,
  },
  chipActive: {
    backgroundColor: Colors.black,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
});
