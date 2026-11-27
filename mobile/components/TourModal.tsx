import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { PaperSheet } from './PaperSheet';
import { CraftButton } from './CraftButton';

const OB_SLIDES = [
  {
    em: '📸',
    title: 'Snap ANY Real Object',
    desc: 'Take a photo of a street sign, sneaker, toy, or cup—or upload from your gallery.',
  },
  {
    em: '🧠',
    title: 'Neural Lift + Gemini Polish',
    desc: 'Our server-side RMBG / GrabCut matting lifts your subject cleanly, and Gemini heals cropped edges.',
  },
  {
    em: '🧊',
    title: 'Build Crisp 3D Paper Models',
    desc: 'Preview your exact cutout as a sharp, vibrant 3D cardstock model with a 12cm size buddy.',
  },
  {
    em: '🖨️',
    title: 'AI Cutout on Printing Paper',
    desc: 'Export an exact-scale A4/Letter PDF blueprint or let Gemini draw a cutout sheet, then fold & glue!',
  },
];

interface TourModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TourModal({ visible, onClose }: TourModalProps) {
  const [idx, setIdx] = useState(0);
  const slide = OB_SLIDES[idx] || OB_SLIDES[0];

  const handleClose = () => {
    setIdx(0);
    onClose();
  };

  const handleNext = () => {
    if (idx < OB_SLIDES.length - 1) {
      setIdx(idx + 1);
    } else {
      handleClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <PaperSheet style={styles.card}>
          <Text style={styles.emoji}>{slide.em}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.desc}>{slide.desc}</Text>

          <View style={styles.dotsRow}>
            {OB_SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.btnRow}>
            <CraftButton
              title="Skip"
              variant="paper"
              onPress={handleClose}
              style={{ flex: 0.85 }}
            />
            <CraftButton
              title={idx === OB_SLIDES.length - 1 ? "Let's Craft! 🚀" : 'Next ›'}
              variant="primary"
              onPress={handleNext}
              style={{ flex: 1.3 }}
            />
          </View>
        </PaperSheet>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 20, 16, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    padding: 18,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
    textAlign: 'center',
  },
  desc: {
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#cbd5e1',
  },
  dotActive: {
    width: 22,
    backgroundColor: Colors.ink,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
});
