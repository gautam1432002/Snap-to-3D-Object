import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Printer, Share2, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { Colors, Radii, Spacing } from '../../constants/theme';
import { BentoCard } from '../BentoCard';

interface Stage5PrintProps {
  modelName: string;
  paperSize: 'A4' | 'Letter';
  selectedSampleId: string | null;
  previewPage: 1 | 2;
  isPrinting: boolean;
  isSharing: boolean;
  onChangePage: (page: 1 | 2) => void;
  onPrint: () => void;
  onShare: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function Stage5Print({
  modelName,
  paperSize,
  selectedSampleId,
  previewPage,
  isPrinting,
  isSharing,
  onChangePage,
  onPrint,
  onShare,
  onBack,
  onNext,
}: Stage5PrintProps) {
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
      <BentoCard title="Printable Blueprint" subtitle={`Format: ${paperSize} • Exact 300 DPI vector scale`}>
        {/* Page Switcher */}
        <View style={styles.pageToggleRow}>
          <TouchableOpacity
            onPress={() => onChangePage(1)}
            style={[styles.pageToggleBtn, previewPage === 1 && styles.pageToggleBtnActive]}
          >
            <Text style={[styles.pageToggleText, previewPage === 1 && styles.pageToggleTextActive]}>
              Page 1: Front/Back & Stand
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onChangePage(2)}
            style={[styles.pageToggleBtn, previewPage === 2 && styles.pageToggleBtnActive]}
          >
            <Text style={[styles.pageToggleText, previewPage === 2 && styles.pageToggleTextActive]}>
              Page 2: Side Depth Strips
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scaled Sheet Mockup */}
        <View style={styles.sheetMockup}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitleText}>{modelName.toUpperCase()}</Text>
            <View style={styles.sheetRulerBox}>
              <Text style={styles.sheetRulerText}>| 50 mm Ruler Check |</Text>
            </View>
          </View>

          {previewPage === 1 ? (
            <View style={styles.sheetPage1Body}>
              <View style={styles.sheetCutoutBox}>
                <Text style={{ fontSize: 36 }}>{sampleEmoji}</Text>
                <Text style={styles.sheetCutoutLabel}>Front Cut Line</Text>
              </View>
              <View style={styles.sheetCutoutBox}>
                <Text style={{ fontSize: 36, opacity: 0.6 }}>{sampleEmoji}</Text>
                <Text style={styles.sheetCutoutLabel}>Mirrored Back</Text>
              </View>
            </View>
          ) : (
            <View style={styles.sheetPage2Body}>
              <View style={styles.stripMock}>
                <Text style={styles.stripLabel}>Side Depth Strip A (trapezoid tabs)</Text>
              </View>
              <View style={styles.stripMock}>
                <Text style={styles.stripLabel}>Side Depth Strip B (glue circles 1 ↔ 1, 2 ↔ 2)</Text>
              </View>
            </View>
          )}
        </View>

        {/* Native Print & Share Buttons */}
        <View style={styles.printActionRow}>
          <TouchableOpacity
            onPress={onPrint}
            disabled={isPrinting || isSharing}
            style={[styles.printBtnPrimary, (isPrinting || isSharing) && { opacity: 0.6 }]}
          >
            {isPrinting ? (
              <ActivityIndicator size="small" color="#0D1210" />
            ) : (
              <Printer size={18} color="#0D1210" />
            )}
            <Text style={styles.printBtnPrimaryText}>
              {isPrinting ? 'Preparing Print...' : 'Print PDF (100% Scale)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onShare}
            disabled={isPrinting || isSharing}
            style={[styles.shareBtnSecondary, (isPrinting || isSharing) && { opacity: 0.6 }]}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={Colors.ink} />
            ) : (
              <Share2 size={18} color={Colors.ink} />
            )}
            <Text style={styles.shareBtnSecondaryText}>
              {isSharing ? 'Exporting...' : 'Save / Share'}
            </Text>
          </TouchableOpacity>
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
            <Text style={styles.btnPrimaryText}>Assembly Guide</Text>
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
  pageToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  pageToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  pageToggleBtnActive: {
    borderColor: Colors.ruler,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  pageToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
  },
  pageToggleTextActive: {
    color: Colors.ruler,
    fontWeight: '800',
  },
  sheetMockup: {
    backgroundColor: '#FDFDFB',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.md,
    minHeight: 200,
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0F172A',
    paddingBottom: 6,
    marginBottom: 12,
  },
  sheetTitleText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  sheetRulerBox: {
    backgroundColor: '#FEF08A',
    borderWidth: 1,
    borderColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  sheetRulerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetPage1Body: {
    flexDirection: 'row',
    gap: 12,
    height: 120,
  },
  sheetCutoutBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderStyle: 'dashed',
    borderRadius: Radii.sm,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetCutoutLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 4,
  },
  sheetPage2Body: {
    gap: 10,
    justifyContent: 'center',
    height: 120,
  },
  stripMock: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    backgroundColor: '#EFF6FF',
    borderRadius: Radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  stripLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  printActionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  printBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: Radii.md,
    backgroundColor: Colors.ruler,
  },
  printBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D1210',
  },
  shareBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  shareBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
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
