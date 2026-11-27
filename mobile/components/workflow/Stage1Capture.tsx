import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Colors } from '../../constants/theme';
import { CraftButton } from '../CraftButton';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';

interface Stage1CaptureProps {
  capturedUri: string | null;
  selectedSampleId: string | null;
  modelName: string;
  onTakePhoto: () => void;
  onPickGallery: () => void;
  onSelectSample: (sampleId: 'crossing' | 'sneaker' | 'fox' | 'boba') => void;
  onRetake: () => void;
  onConfirm: () => void;
}

export function Stage1Capture({
  capturedUri,
  selectedSampleId,
  modelName,
  onTakePhoto,
  onPickGallery,
  onSelectSample,
  onRetake,
  onConfirm,
}: Stage1CaptureProps) {
  const [showTips, setShowTips] = useState(false);

  const activeSample =
    selectedSampleId && SAMPLE_TEMPLATES[selectedSampleId as keyof typeof SAMPLE_TEMPLATES]
      ? SAMPLE_TEMPLATES[selectedSampleId as keyof typeof SAMPLE_TEMPLATES]
      : SAMPLE_TEMPLATES.crossing;

  const statusText = capturedUri
    ? '📸 Photo ready! Confirm below'
    : `📷 Sample: ${activeSample.name}`;

  return (
    <View style={styles.container}>
      {/* Viewfinder Target Area */}
      <View style={styles.viewportBox}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        <View style={styles.statusPill}>
          <Text style={styles.statusPillText} numberOfLines={1}>
            {statusText}
          </Text>
        </View>

        {capturedUri ? (
          <Image
            source={{ uri: capturedUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.sampleWrap}>
            <SvgXml xml={activeSample.svgMarkup} width={175} height={175} />
            <Text style={styles.sampleLabel}>{modelName || activeSample.name}</Text>
          </View>
        )}
      </View>

      {capturedUri ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmHint}>
            Looks clear! Tap below to run edge-by-edge Subject Lift & Quality Check on your server.
          </Text>
          <View style={styles.btnRow}>
            <CraftButton
              title="↺ Retake"
              variant="alt"
              onPress={onRetake}
              style={{ flex: 0.8 }}
            />
            <CraftButton
              title="✂️ Confirm & Lift →"
              variant="primary"
              onPress={onConfirm}
              style={{ flex: 1.4 }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.liveBox}>
          {/* Upload / Shutter / Gallery Row */}
          <View style={styles.shutterRow}>
            <CraftButton
              title="🖼️ Gallery"
              variant="alt"
              small
              onPress={onPickGallery}
              style={{ width: 102 }}
            />

            <TouchableOpacity
              onPress={onTakePhoto}
              activeOpacity={0.85}
              style={styles.shutterBtn}
              accessibilityLabel="Take photo with camera"
            />

            <CraftButton
              title="📷 Camera"
              variant="alt"
              small
              onPress={onTakePhoto}
              style={{ width: 102 }}
            />
          </View>

          {/* Crisp Sample Objects */}
          <View style={styles.matCard}>
            <View style={styles.secHead}>
              <Text style={styles.sampleHeadText}>
                Or test with a crisp sample object:
              </Text>
              <TouchableOpacity
                onPress={() => setShowTips((v) => !v)}
                style={styles.infoBtn}
              >
                <Text style={styles.infoBtnText}>i</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {(
                [
                  { id: 'crossing', label: '🚸 Crossing Sign' },
                  { id: 'sneaker', label: '👟 Retro Sneaker' },
                  { id: 'fox', label: '🦊 Fox Sticker' },
                  { id: 'boba', label: '🧋 Boba Cup' },
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

          {showTips && (
            <View style={styles.infoDrawer}>
              <Text style={styles.infoText}>
                📸 <Text style={{ fontWeight: '800' }}>Tips for a super clean Subject Lift:</Text>
                {'\n'}• Center your object with a little space around all edges.
                {'\n'}• Plain or contrasting backgrounds give ultra-sharp cutouts.
                {'\n'}• Even if an edge is cropped, Gemini Polish restores missing pixels!
              </Text>
            </View>
          )}

          <CraftButton
            title={`✂️ Lift & Craft "${activeSample.shortName}" Sample →`}
            variant="primary"
            onPress={onConfirm}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 11 },
  viewportBox: {
    height: 245,
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
  statusPill: {
    position: 'absolute',
    top: 10,
    zIndex: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 38, 32, 0.78)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    maxWidth: '86%',
  },
  statusPillText: {
    color: Colors.inkOnMat,
    fontSize: 11,
    fontWeight: '700',
  },
  previewImage: {
    width: '92%',
    height: '86%',
  },
  sampleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 22,
  },
  sampleLabel: {
    color: Colors.sage,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  liveBox: {
    gap: 10,
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  shutterBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: Colors.cut,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  matCard: {
    backgroundColor: Colors.matCardBg,
    borderWidth: 1.5,
    borderColor: Colors.matCardBorder,
    borderRadius: 16,
    padding: 10,
    gap: 8,
  },
  secHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sampleHeadText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.inkOnMat,
  },
  infoBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnText: {
    color: Colors.ruler,
    fontSize: 11,
    fontWeight: '800',
  },
  chipRow: {
    gap: 7,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
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
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.inkOnMat,
  },
  chipTextActive: {
    color: Colors.ink,
    fontWeight: '800',
  },
  infoDrawer: {
    backgroundColor: 'rgba(16, 38, 32, 0.95)',
    borderWidth: 1.5,
    borderColor: Colors.ruler,
    borderRadius: 14,
    padding: 10,
  },
  infoText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: Colors.inkOnMat,
  },
  confirmBox: {
    gap: 10,
  },
  confirmHint: {
    fontSize: 12,
    color: Colors.sage,
    textAlign: 'center',
    lineHeight: 17,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
