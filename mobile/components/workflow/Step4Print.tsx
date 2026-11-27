import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import Svg, {
  Rect,
  Line,
  Polygon,
  Circle,
  Text as SvgText,
  G,
  SvgXml,
} from 'react-native-svg';
import { Colors } from '../../constants/theme';
import { PaperSheet } from '../PaperSheet';
import { CraftButton } from '../CraftButton';
import { ContourPoint, SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';
import { buildBlueprintGeometry } from '../../utils/pdfTemplate';

interface Step4PrintProps {
  modelName: string;
  category: string;
  paperSize: 'A4' | 'Letter';
  heightCm: number;
  depthCm: number;
  includeStand: boolean;
  edgeColorHex: string;
  perimeterMm: number;
  contour: ContourPoint[];
  artworkUri: string;
  sampleId: string | null;
  isRealPhoto: boolean;
  aiSheetBase64: string | null;
  aiSheetWarning: string | null;
  isGeneratingSheet: boolean;
  isPrinting: boolean;
  isSharing: boolean;
  glueTimerSec: number;
  isTimerRunning: boolean;
  onChangePaperSize: (sz: 'A4' | 'Letter') => void;
  onGenerateAiSheet: () => void;
  onPrint: () => void;
  onShare: () => void;
  onStartTimer: () => void;
  onMarkDone: () => void;
  onBack: () => void;
}

const FOLD_STEPS = [
  { num: 1, title: 'Print at 100% Scale', desc: 'Disable "Fit to Page". Verify the golden scale bar is 5 cm.' },
  { num: 2, title: 'Cut Solid Red Lines', desc: 'Cut Front, Mirrored Back, Side Strip, and Desk Stand.' },
  { num: 3, title: 'Score Blue Dashed Lines', desc: 'Crease along a ruler before folding the glue tabs 90°.' },
  { num: 4, title: 'Glue Side Strip & Match 1..6', desc: 'Match numbers 1–6 on the strip to the Front, holding 20s per section.' },
  { num: 5, title: 'Seal Back & Attach Stand', desc: 'Glue the remaining tabs to the Mirrored Back and fold the base stand.' },
];

export function Step4Print({
  modelName,
  category,
  paperSize,
  heightCm,
  depthCm,
  includeStand,
  edgeColorHex,
  perimeterMm,
  contour,
  artworkUri,
  sampleId,
  isRealPhoto,
  aiSheetBase64,
  aiSheetWarning,
  isGeneratingSheet,
  isPrinting,
  isSharing,
  glueTimerSec,
  isTimerRunning,
  onChangePaperSize,
  onGenerateAiSheet,
  onPrint,
  onShare,
  onStartTimer,
  onMarkDone,
  onBack,
}: Step4PrintProps) {
  const [sheetIdx, setSheetIdx] = useState<0 | 1 | 2>(0);
  const [guideOpen, setGuideOpen] = useState(false);

  const L = buildBlueprintGeometry({
    modelName,
    category,
    paperSize,
    heightCm,
    depthCm,
    moldStyle: 'block',
    includeStand,
    edgeColorHex,
    perimeterMm,
    contour,
  });

  const previewW = 286;
  const previewH = Math.round(previewW * (L.pageH / L.pageW));
  const mmToPx = previewW / L.pageW;

  const maxW = (L.pageW - 32) / 2;
  const maxH = L.pageH - (includeStand ? 92 : 46);
  const fitScale = Math.min(1, maxW / Math.max(10, L.objW), maxH / Math.max(10, L.objH));
  const dw = L.objW * fitScale;
  const dh = L.objH * fitScale;
  const fx = 14;
  const bx = 18 + maxW;
  const fy = 30;

  const polyStr = (ox: number, oy: number, mirror = false) =>
    L.pts
      .map((p) => `${(ox + (mirror ? 1 - p.x : p.x) * dw).toFixed(1)},${(oy + p.y * dh).toFixed(1)}`)
      .join(' ');

  const nMarks = Math.min(6, L.pts.length);
  const gluePins = Array.from({ length: nMarks }, (_, m) => {
    const p = L.pts[Math.floor((m / nMarks) * L.pts.length)];
    return {
      pair: m + 1,
      fx: fx + p.x * dw,
      fy: fy + p.y * dh,
      bx: bx + (1 - p.x) * dw,
      by: fy + p.y * dh,
    };
  });

  const stripH = Math.max(14, Math.min(44, L.depthMm));
  const tabH = 6.5;
  const maxRowW = L.pageW - 30;
  const totalW = Math.max(120, L.perim);
  const rows = Math.min(4, Math.max(1, Math.ceil(totalW / maxRowW)));
  const drawW = (totalW / rows) * Math.min(1, maxRowW / (totalW / rows));

  const activeSample =
    !isRealPhoto && sampleId && SAMPLE_TEMPLATES[sampleId as keyof typeof SAMPLE_TEMPLATES]
      ? SAMPLE_TEMPLATES[sampleId as keyof typeof SAMPLE_TEMPLATES]
      : null;

  const renderArtworkBox = (xMm: number, yMm: number, mirror: boolean) => {
    const left = xMm * mmToPx;
    const top = yMm * mmToPx;
    const w = dw * mmToPx;
    const h = dh * mmToPx;
    return (
      <View
        pointerEvents="none"
        style={[
          styles.artOverlay,
          { left, top, width: w, height: h },
          mirror && { transform: [{ scaleX: -1 }] },
        ]}
      >
        {activeSample && !artworkUri.startsWith('data:image/png') ? (
          <SvgXml xml={activeSample.svgMarkup} width={w} height={h} />
        ) : (
          <Image source={{ uri: artworkUri }} style={{ width: w, height: h }} resizeMode="contain" />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sheet Switcher + Paper Size Pill */}
      <View style={styles.topBar}>
        <View style={styles.segSwitch}>
          <TouchableOpacity
            onPress={() => setSheetIdx(0)}
            style={[styles.segTab, sheetIdx === 0 && styles.segTabActive]}
          >
            <Text style={[styles.segTabText, sheetIdx === 0 && styles.segTabTextActive]} numberOfLines={1}>
              Sheet 1: Model
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSheetIdx(1)}
            style={[styles.segTab, sheetIdx === 1 && styles.segTabActive]}
          >
            <Text style={[styles.segTabText, sheetIdx === 1 && styles.segTabTextActive]} numberOfLines={1}>
              Sheet 2: Strip
            </Text>
          </TouchableOpacity>
          {!!aiSheetBase64 && (
            <TouchableOpacity
              onPress={() => setSheetIdx(2)}
              style={[styles.segTab, sheetIdx === 2 && styles.segTabActive]}
            >
              <Text style={[styles.segTabText, sheetIdx === 2 && styles.segTabTextActive]} numberOfLines={1}>
                ✨ AI
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => onChangePaperSize(paperSize === 'A4' ? 'Letter' : 'A4')}
          style={styles.paperPill}
          activeOpacity={0.8}
        >
          <Text style={styles.paperPillText}>{paperSize}</Text>
        </TouchableOpacity>
      </View>

      {/* Pure White Elevated Blueprint Preview Stage */}
      <PaperSheet style={styles.sheetStage}>
        {sheetIdx === 2 && aiSheetBase64 ? (
          <View style={[styles.paperFrame, { width: previewW, height: previewH, padding: 8 }]}>
            <Image
              source={{ uri: aiSheetBase64 }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={[styles.paperFrame, { width: previewW, height: previewH }]}>
            {sheetIdx === 0 && (
              <>
                {renderArtworkBox(fx, fy, false)}
                {renderArtworkBox(bx, fy, true)}
              </>
            )}
            <Svg width={previewW} height={previewH} viewBox={`0 0 ${L.pageW} ${L.pageH}`}>
              <Rect
                x={8}
                y={8}
                width={L.pageW - 16}
                height={L.pageH - 16}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={0.5}
                strokeDasharray="3 2"
              />
              <SvgText x={12} y={15} fontSize="4.6" fontWeight="800" fill="#0F2238">
                {`FOLDLY • ${modelName.toUpperCase()} (${paperSize})`}
              </SvgText>

              <Rect
                x={L.pageW - 64}
                y={11}
                width={50}
                height={4.2}
                fill="#FFB020"
                stroke="#0F2238"
                strokeWidth={0.4}
              />
              <SvgText x={L.pageW - 39} y={19} textAnchor="middle" fontSize="3.2" fontWeight="700" fill="#0F2238">
                5 cm Scale Check
              </SvgText>

              {sheetIdx === 0 ? (
                <>
                  <Polygon points={polyStr(fx, fy, false)} fill="none" stroke="#FF5A6E" strokeWidth={0.9} />
                  <Polygon points={polyStr(bx, fy, true)} fill="none" stroke="#FF5A6E" strokeWidth={0.9} />
                  {gluePins.map((g) => (
                    <G key={g.pair}>
                      <Circle cx={g.fx} cy={g.fy} r={3.8} fill={Colors.fold} stroke="#fff" strokeWidth={0.5} />
                      <SvgText x={g.fx} y={g.fy + 1.3} textAnchor="middle" fontSize="3.4" fontWeight="800" fill="#fff">
                        {g.pair}
                      </SvgText>
                      <Circle cx={g.bx} cy={g.by} r={3.8} fill={Colors.fold} stroke="#fff" strokeWidth={0.5} />
                      <SvgText x={g.bx} y={g.by + 1.3} textAnchor="middle" fontSize="3.4" fontWeight="800" fill="#fff">
                        {g.pair}
                      </SvgText>
                    </G>
                  ))}
                  {includeStand && (
                    <G>
                      <Rect
                        x={(L.pageW - 88) / 2}
                        y={L.pageH - 58}
                        width={88}
                        height={36}
                        fill="#f8fafc"
                        stroke="#FF5A6E"
                        strokeWidth={0.8}
                      />
                      <Line
                        x1={(L.pageW - 88) / 2}
                        y1={L.pageH - 40}
                        x2={(L.pageW + 88) / 2}
                        y2={L.pageH - 40}
                        stroke="#246BFD"
                        strokeWidth={0.8}
                        strokeDasharray="2.5 1.8"
                      />
                      <SvgText x={L.pageW / 2} y={L.pageH - 46} textAnchor="middle" fontSize="4" fontWeight="800" fill="#0F2238">
                        DESK STAND
                      </SvgText>
                    </G>
                  )}
                </>
              ) : (
                <>
                  {Array.from({ length: rows }, (_, r) => {
                    const x0 = 15;
                    const y0 = 38 + r * (stripH + tabH * 2 + 18);
                    if (y0 + stripH + tabH > L.pageH - 14) return null;
                    const teeth = 8;
                    const tw = drawW / teeth;
                    return (
                      <G key={r}>
                        {Array.from({ length: teeth }, (__, t) => {
                          const tx = x0 + t * tw;
                          return (
                            <G key={t}>
                              <Polygon
                                points={`${tx},${y0} ${tx + 2},${y0 - tabH} ${tx + tw - 2},${y0 - tabH} ${tx + tw},${y0}`}
                                fill="#FFE4E6"
                                stroke="#FF5A6E"
                                strokeWidth={0.5}
                              />
                              <Polygon
                                points={`${tx},${y0 + stripH} ${tx + 2},${y0 + stripH + tabH} ${tx + tw - 2},${y0 + stripH + tabH} ${tx + tw},${y0 + stripH}`}
                                fill="#FFE4E6"
                                stroke="#FF5A6E"
                                strokeWidth={0.5}
                              />
                            </G>
                          );
                        })}
                        <Rect
                          x={x0}
                          y={y0}
                          width={drawW}
                          height={stripH}
                          fill={edgeColorHex || '#246BFD'}
                          fillOpacity={0.22}
                          stroke="#246BFD"
                          strokeWidth={0.7}
                          strokeDasharray="2.5 1.8"
                        />
                        <Circle cx={x0 + drawW / 2} cy={y0 + stripH / 2} r={4.2} fill={Colors.fold} stroke="#fff" strokeWidth={0.5} />
                        <SvgText x={x0 + drawW / 2} y={y0 + stripH / 2 + 1.4} textAnchor="middle" fontSize="3.6" fontWeight="800" fill="#fff">
                          {(r % 6) + 1}
                        </SvgText>
                      </G>
                    );
                  })}
                </>
              )}
            </Svg>
          </View>
        )}
      </PaperSheet>

      {aiSheetWarning && (
        <View style={styles.warnMini}>
          <Text style={styles.warnMiniText}>⚠️ {aiSheetWarning}</Text>
        </View>
      )}

      {/* Primary Share PDF CTA */}
      <CraftButton
        title="Share / Save PDF"
        variant="primary"
        loading={isSharing}
        onPress={onShare}
      />

      {/* Print & Gemini AI Sheet Row */}
      <View style={styles.btnRow}>
        <CraftButton
          title="🖨️ Print Sheet"
          variant="soft"
          small
          loading={isPrinting}
          onPress={onPrint}
          style={{ flex: 1 }}
        />
        <CraftButton
          title={isGeneratingSheet ? 'Drawing...' : '✨ Gemini AI Sheet'}
          variant="soft"
          small
          loading={isGeneratingSheet}
          onPress={() => {
            onGenerateAiSheet();
            setSheetIdx(2);
          }}
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.btnRow}>
        <CraftButton
          title="‹ Back"
          variant="soft"
          small
          onPress={onBack}
          style={{ flex: 0.65 }}
        />
        <CraftButton
          title="📋 Fold Guide & 20s Glue Timer"
          variant="teal"
          small
          onPress={() => setGuideOpen(true)}
          style={{ flex: 1.65 }}
        />
      </View>

      {/* Concise 5-Step Fold Guide & 20s Haptic Timer Modal */}
      <Modal
        visible={guideOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setGuideOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <PaperSheet style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Fold Guide & Glue Timer</Text>
              <TouchableOpacity onPress={() => setGuideOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 270 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 11 }}>
                {FOLD_STEPS.map((st) => (
                  <View key={st.num} style={styles.foldStepRow}>
                    <View style={styles.foldStepBadge}>
                      <Text style={styles.foldStepNum}>{st.num}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foldStepTitle}>{st.title}</Text>
                      <Text style={styles.foldStepDesc}>{st.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            <CraftButton
              title={
                isTimerRunning
                  ? `⏳ Hold firmly... ${glueTimerSec}s`
                  : glueTimerSec === 0
                  ? '✅ Bonded! Tap for another 20s'
                  : '⏱️ Start 20s Glue Timer'
              }
              variant="soft"
              onPress={onStartTimer}
              disabled={isTimerRunning}
              style={{ borderColor: Colors.fold, backgroundColor: Colors.softSky }}
            />

            <CraftButton
              title="Mark Craft Done"
              variant="primary"
              onPress={() => {
                setGuideOpen(false);
                onMarkDone();
              }}
            />
          </PaperSheet>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 11 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segSwitch: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 999,
    padding: 4,
    gap: 4,
    shadowColor: Colors.skyShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  segTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segTabActive: {
    backgroundColor: Colors.black,
  },
  segTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.muted,
  },
  segTabTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  paperPill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.white,
    shadowColor: Colors.skyShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  paperPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.ink,
  },
  sheetStage: {
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperFrame: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.softSkyBorder,
    position: 'relative',
    overflow: 'hidden',
  },
  artOverlay: {
    position: 'absolute',
    zIndex: 1,
  },
  warnMini: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 9,
  },
  warnMiniText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 9,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 34, 56, 0.45)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  modalCard: {
    width: '100%',
    gap: 12,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.ink,
  },
  modalClose: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.muted,
    padding: 4,
  },
  foldStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  foldStepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.fold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  foldStepNum: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  foldStepTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  foldStepDesc: {
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 16.5,
    marginTop: 1,
  },
});
