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
      {/* Clean Viewfinder Frame */}
      <View style={styles.viewportBox}>
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
            <SvgXml xml={activeSample.svgMarkup} width={175} height={175} />
            <Text style={styles.sampleLabel}>
              Sample: {modelName || activeSample.name}
            </Text>
          </View>
        )}
      </View>

      {capturedUri ? (
        <View style={styles.confirmBox}>
          <Text style={styles.hint}>
            Photo compressed cleanly at 1024px. Ready to lift the cutout!
          </Text>
          <View style={styles.btnRow}>
            <CraftButton
              title="↺ Retake"
              variant="alt"
              onPress={onRetake}
              style={{ flex: 0.8 }}
            />
            <CraftButton
              title="Lift Cutout →"
              variant="primary"
              onPress={onConfirm}
              style={{ flex: 1.4 }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.controlsBox}>
          {/* Primary Camera & Gallery Actions */}
          <View style={styles.btnRow}>
            <CraftButton
              title="Take Photo"
              variant="primary"
              icon={<Camera size={18} color={Colors.ink} strokeWidth={2.3} />}
              onPress={onTakePhoto}
              style={{ flex: 1 }}
            />
            <CraftButton
              title="Choose Photo"
              variant="paper"
              icon={<ImageIcon size={18} color={Colors.ink} strokeWidth={2.2} />}
              onPress={onPickGallery}
              style={{ flex: 1 }}
            />
          </View>

          {/* Compact Sample Chips */}
          <View style={styles.sampleCard}>
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
          </View>

          <CraftButton
            title={`Craft "${activeSample.shortName}" Sample →`}
            variant="teal"
            onPress={onConfirm}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  viewportBox: {
    height: 255,
    borderRadius: 20,
    backgroundColor: '#0d1f1a',
    borderWidth: 2,
    borderColor: 'rgba(157, 184, 175, 0.35)',
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
    borderColor: Colors.ruler,
    borderRadius: 4,
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
  },
  sampleLabel: {
    color: Colors.sage,
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 6,
  },
  controlsBox: { gap: 11 },
  confirmBox: { gap: 10 },
  hint: {
    fontSize: 12.5,
    color: Colors.sage,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 9,
  },
  sampleCard: {
    backgroundColor: Colors.matCardBg,
    borderWidth: 1.5,
    borderColor: Colors.matCardBorder,
    borderRadius: 16,
    padding: 11,
    gap: 8,
  },
  sampleHead: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.inkOnMat,
  },
  chipRow: { gap: 8 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(157, 184, 175, 0.4)',
    backgroundColor: 'rgba(16, 38, 32, 0.72)',
  },
  chipActive: {
    backgroundColor: Colors.ruler,
    borderColor: Colors.ink,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.inkOnMat,
  },
  chipTextActive: {
    color: Colors.ink,
    fontWeight: '800',
  },
});
