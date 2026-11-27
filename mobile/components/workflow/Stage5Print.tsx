import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
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
import { CraftButton } from '../CraftButton';
import { ContourPoint, SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';
import { buildBlueprintGeometry } from '../../utils/pdfTemplate';

interface Stage5PrintProps {
  modelName: string;
  category: string;
  paperSize: 'A4' | 'Letter';
  heightCm: number;
  depthCm: number;
  moldStyle: 'block' | 'standee';
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
  onChangePaperSize: (sz: 'A4' | 'Letter') => void;
  onGenerateAiSheet: () => void;
  onPrint: () => void;
  onShare: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function Stage5Print({
  modelName,
  category,
  paperSize,
  heightCm,
  depthCm,
  moldStyle,
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
  onChangePaperSize,
  onGenerateAiSheet,
  onPrint,
  onShare,
  onBack,
  onNext,
}: Stage5PrintProps) {
  const [pageIdx, setPageIdx] = useState<0 | 1 | 2>(0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [selectedGluePair, setSelectedGluePair] = useState<number | null>(null);

  const L = buildBlueprintGeometry({
    modelName,
    category,
    paperSize,
    heightCm,
    depthCm,
    moldStyle,
    includeStand,
    edgeColorHex,
    perimeterMm,
    contour,
  });

  const baseSheetW = 286;
  const baseSheetH = Math.round(baseSheetW * (L.pageH / L.pageW));
  const scaledW = baseSheetW * zoom;
  const scaledH = baseSheetH * zoom;
  const mmToPx = scaledW / L.pageW;

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
  const rowLen = totalW / rows;
  const drawW = rowLen * Math.min(1, maxRowW / rowLen);

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
          <Image
            source={{ uri: artworkUri }}
            style={{ width: w, height: h }}
            resizeMode="contain"
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Info + Paper Size Switch */}
      <View style={styles.topRow}>
        <View style={styles.infoBadge}>
          <Text style={styles.infoBadgeText}>
            {pageIdx === 2
              ? `✨ ${paperSize} • Gemini AI Cutout`
              : `📄 ${paperSize} • Page ${pageIdx + 1} of ${aiSheetBase64 ? 3 : 2}`}
          </Text>
        </View>
        <View style={styles.paperBtns}>
          {(['A4', 'Letter'] as const).map((sz) => {
            const active = paperSize === sz;
            return (
              <TouchableOpacity
                key={sz}
                onPress={() => onChangePaperSize(sz)}
                style={[styles.paperBtn, active && styles.paperBtnActive]}
              >
                <Text style={[styles.paperBtnText, active && styles.paperBtnTextActive]}>
                  {sz}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3 Page Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {(
          [
            { idx: 0 as const, label: 'Page 1: Front & Back' },
            { idx: 1 as const, label: 'Page 2: Side Strip' },
            { idx: 2 as const, label: '✨ AI Paper Cutout' },
          ]
        ).map((tab) => {
          const active = pageIdx === tab.idx;
          return (
            <TouchableOpacity
              key={tab.idx}
              onPress={() => setPageIdx(tab.idx)}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Gemini Cutout Sheet Button */}
      <CraftButton
        title={
          isGeneratingSheet
            ? '✨ Gemini is drawing on printing paper...'
            : aiSheetBase64
              ? '🔄 Redraw Complete Cutout Sheet (Gemini)'
              : '✨ Draw Complete Cutout Sheet on Printing Paper (Gemini)'
        }
        variant="teal"
        small
        loading={isGeneratingSheet}
        onPress={() => {
          setPageIdx(2);
          onGenerateAiSheet();
        }}
      />

      {/* Interactive Paper Sheet Viewport */}
      <View style={styles.paperStage}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paperScrollContent}
        >
          {pageIdx === 2 ? (
            <View style={[styles.paperFrame, { width: scaledW, minHeight: scaledH }]}>
              {isGeneratingSheet ? (
                <View style={styles.aiLoadingBox}>
                  <ActivityIndicator size="large" color={Colors.teal} />
                  <Text style={styles.aiLoadingText}>
                    ✨ Gemini is drawing your Neural cutout design on {paperSize} printing paper...
                  </Text>
                </View>
              ) : aiSheetBase64 ? (
                <View style={{ width: '100%', gap: 6 }}>
                  {aiSheetWarning && (
                    <View style={styles.warnMini}>
                      <Text style={styles.warnMiniText}>⚠️ {aiSheetWarning}</Text>
                    </View>
                  )}
                  <Image
                    source={{ uri: aiSheetBase64 }}
                    style={{ width: '100%', height: scaledH - 20 }}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={styles.aiEmptyBox}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>✨</Text>
                  <Text style={styles.aiEmptyText}>
                    Tap <Text style={{ fontWeight: '800' }}>Draw Complete Cutout Sheet</Text> above to let Gemini draw a ready-to-print flat papercraft sheet from your cutout!
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.paperFrame,
                { width: scaledW, height: scaledH, padding: 0 },
              ]}
            >
              {/* Artwork layer for Page 1 */}
              {pageIdx === 0 && (
                <>
                  {renderArtworkBox(fx, fy, false)}
                  {renderArtworkBox(bx, fy, true)}
                </>
              )}

              {/* Precision Millimeter SVG Vector Blueprint */}
              <Svg
                width={scaledW}
                height={scaledH}
                viewBox={`0 0 ${L.pageW} ${L.pageH}`}
              >
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
                <SvgText
                  x={12}
                  y={15}
                  fontSize="4.6"
                  fontWeight="800"
                  fill="#17201d"
                >
                  {`FOLDLY • ${modelName.toUpperCase()} (${paperSize} • Page ${pageIdx + 1}/${aiSheetBase64 ? 3 : 2})`}
                </SvgText>

                {/* 50 mm Calibration Ruler */}
                <Rect
                  x={L.pageW - 64}
                  y={11}
                  width={50}
                  height={4.2}
                  fill="#f4c430"
                  stroke="#17201d"
                  strokeWidth={0.4}
                />
                {[0, 10, 20, 30, 40, 50].map((mm) => (
                  <Line
                    key={mm}
                    x1={L.pageW - 64 + mm}
                    y1={11}
                    x2={L.pageW - 64 + mm}
                    y2={15.2}
                    stroke="#17201d"
                    strokeWidth={0.4}
                  />
                ))}
                <SvgText
                  x={L.pageW - 39}
                  y={19}
                  textAnchor="middle"
                  fontSize="3.2"
                  fontWeight="700"
                  fill="#17201d"
                >
                  Scale Check: 5 cm (100% print)
                </SvgText>

                {pageIdx === 0 ? (
                  <>
                    {/* Red Traced Contour Cut Lines */}
                    <Polygon
                      points={polyStr(fx, fy, false)}
                      fill="none"
                      stroke="#e63946"
                      strokeWidth={0.9}
                    />
                    <SvgText
                      x={fx + dw / 2}
                      y={fy + dh + 6}
                      textAnchor="middle"
                      fontSize="4.2"
                      fontWeight="800"
                      fill="#17201d"
                    >
                      FRONT ARTWORK
                    </SvgText>

                    <Polygon
                      points={polyStr(bx, fy, true)}
                      fill="none"
                      stroke="#e63946"
                      strokeWidth={0.9}
                    />
                    <SvgText
                      x={bx + dw / 2}
                      y={fy + dh + 6}
                      textAnchor="middle"
                      fontSize="4.2"
                      fontWeight="800"
                      fill="#17201d"
                    >
                      BACK ARTWORK (MIRRORED)
                    </SvgText>

                    {/* Clickable Numbered Glue Circles 1..6 */}
                    {gluePins.map((g) => {
                      const hl = selectedGluePair === g.pair;
                      return (
                        <G key={g.pair}>
                          <Circle
                            cx={g.fx}
                            cy={g.fy}
                            r={4.2}
                            fill={hl ? Colors.ruler : Colors.fold}
                            stroke={hl ? Colors.ink : '#ffffff'}
                            strokeWidth={hl ? 1.2 : 0.6}
                            onPress={() => setSelectedGluePair(g.pair)}
                          />
                          <SvgText
                            x={g.fx}
                            y={g.fy + 1.4}
                            textAnchor="middle"
                            fontSize="3.6"
                            fontWeight="800"
                            fill={hl ? Colors.ink : '#ffffff'}
                            onPress={() => setSelectedGluePair(g.pair)}
                          >
                            {g.pair}
                          </SvgText>

                          <Circle
                            cx={g.bx}
                            cy={g.by}
                            r={4.2}
                            fill={hl ? Colors.ruler : Colors.fold}
                            stroke={hl ? Colors.ink : '#ffffff'}
                            strokeWidth={hl ? 1.2 : 0.6}
                            onPress={() => setSelectedGluePair(g.pair)}
                          />
                          <SvgText
                            x={g.bx}
                            y={g.by + 1.4}
                            textAnchor="middle"
                            fontSize="3.6"
                            fontWeight="800"
                            fill={hl ? Colors.ink : '#ffffff'}
                            onPress={() => setSelectedGluePair(g.pair)}
                          >
                            {g.pair}
                          </SvgText>
                        </G>
                      );
                    })}

                    {/* Fold-Out Desk Stand */}
                    {includeStand && (
                      <G>
                        <Rect
                          x={(L.pageW - 88) / 2}
                          y={L.pageH - 58}
                          width={88}
                          height={36}
                          fill="#f8fafc"
                          stroke="#e63946"
                          strokeWidth={0.8}
                        />
                        <Line
                          x1={(L.pageW - 88) / 2}
                          y1={L.pageH - 40}
                          x2={(L.pageW + 88) / 2}
                          y2={L.pageH - 40}
                          stroke="#3b78f0"
                          strokeWidth={0.8}
                          strokeDasharray="2.5 1.8"
                        />
                        <SvgText
                          x={L.pageW / 2}
                          y={L.pageH - 47}
                          textAnchor="middle"
                          fontSize="4"
                          fontWeight="800"
                          fill="#17201d"
                        >
                          FOLD-OUT DESK STAND (GLUE TO BASE)
                        </SvgText>
                        <SvgText
                          x={L.pageW / 2}
                          y={L.pageH - 30}
                          textAnchor="middle"
                          fontSize="3.4"
                          fill="#53655f"
                        >
                          Score dashed blue line &amp; fold 90°
                        </SvgText>
                      </G>
                    )}
                  </>
                ) : (
                  <>
                    <SvgText x={14} y={26} fontSize="3.9" fontWeight="700" fill="#4b5a55">
                      {`Total Perimeter: ${(L.perim / 10).toFixed(1)} cm • Depth: ${(L.depthMm / 10).toFixed(1)} cm`}
                    </SvgText>
                    {Array.from({ length: rows }, (_, r) => {
                      const x0 = 15;
                      const y0 = 38 + r * (stripH + tabH * 2 + 18);
                      if (y0 + stripH + tabH > L.pageH - 14) return null;
                      const teeth = 8;
                      const tw = drawW / teeth;
                      const badgeNum = (r % 6) + 1;
                      const hl = selectedGluePair === badgeNum;

                      return (
                        <G key={r}>
                          {Array.from({ length: teeth }, (__, t) => {
                            const tx = x0 + t * tw;
                            return (
                              <G key={t}>
                                <Polygon
                                  points={`${tx},${y0} ${tx + 2},${y0 - tabH} ${tx + tw - 2},${y0 - tabH} ${tx + tw},${y0}`}
                                  fill="#fde7e9"
                                  stroke="#e63946"
                                  strokeWidth={0.5}
                                />
                                <Polygon
                                  points={`${tx},${y0 + stripH} ${tx + 2},${y0 + stripH + tabH} ${tx + tw - 2},${y0 + stripH + tabH} ${tx + tw},${y0 + stripH}`}
                                  fill="#fde7e9"
                                  stroke="#e63946"
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
                            fill={edgeColorHex || '#2ec4b6'}
                            fillOpacity={0.26}
                            stroke="#3b78f0"
                            strokeWidth={0.7}
                            strokeDasharray="2.5 1.8"
                          />
                          <Line x1={x0} y1={y0} x2={x0} y2={y0 + stripH} stroke="#e63946" strokeWidth={0.8} />
                          <Line x1={x0 + drawW} y1={y0} x2={x0 + drawW} y2={y0 + stripH} stroke="#e63946" strokeWidth={0.8} />
                          {Array.from({ length: teeth - 1 }, (__, t) => {
                            const fxLine = x0 + (t + 1) * tw;
                            return (
                              <Line
                                key={t}
                                x1={fxLine}
                                y1={y0}
                                x2={fxLine}
                                y2={y0 + stripH}
                                stroke="#3b78f0"
                                strokeWidth={0.45}
                                strokeDasharray="2 1.5"
                              />
                            );
                          })}
                          <Circle
                            cx={x0 + drawW / 2}
                            cy={y0 + stripH / 2}
                            r={4.6}
                            fill={hl ? Colors.ruler : Colors.fold}
                            stroke={hl ? Colors.ink : '#ffffff'}
                            strokeWidth={hl ? 1.2 : 0.6}
                            onPress={() => setSelectedGluePair(badgeNum)}
                          />
                          <SvgText
                            x={x0 + drawW / 2}
                            y={y0 + stripH / 2 + 1.5}
                            textAnchor="middle"
                            fontSize="3.8"
                            fontWeight="800"
                            fill={hl ? Colors.ink : '#ffffff'}
                            onPress={() => setSelectedGluePair(badgeNum)}
                          >
                            {badgeNum}
                          </SvgText>
                          <SvgText x={x0 + 3} y={y0 + stripH / 2 + 1.2} fontSize="3.5" fontWeight="800" fill="#17201d">
                            {`STRIP ${r + 1}/${rows}`}
                          </SvgText>
                        </G>
                      );
                    })}
                  </>
                )}

                {/* Legend Footer */}
                <Line x1={14} y1={L.pageH - 13} x2={26} y2={L.pageH - 13} stroke="#e63946" strokeWidth={1} />
                <SvgText x={28} y={L.pageH - 11.7} fontSize="3.5" fontWeight="700" fill="#17201d">
                  Solid Red = Cut
                </SvgText>
                <Line
                  x1={66}
                  y1={L.pageH - 13}
                  x2={78}
                  y2={L.pageH - 13}
                  stroke="#3b78f0"
                  strokeWidth={1}
                  strokeDasharray="2.5 1.5"
                />
                <SvgText x={80} y={L.pageH - 11.7} fontSize="3.5" fontWeight="700" fill="#17201d">
                  Dashed Blue = Fold
                </SvgText>
              </Svg>
            </View>
          )}
        </ScrollView>

        {/* Zoom Controls */}
        <View style={styles.glassControls}>
          <TouchableOpacity
            onPress={() => setZoom((z) => Math.max(0.8, Number((z - 0.2).toFixed(2))))}
            style={styles.glassBtn}
          >
            <Text style={styles.glassBtnText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setZoom(1)} style={styles.glassBtn}>
            <Text style={styles.glassBtnText}>{Math.round(zoom * 100)}%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setZoom((z) => Math.min(1.8, Number((z + 0.2).toFixed(2))))}
            style={styles.glassBtn}
          >
            <Text style={styles.glassBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Interactive Glue Pair Hint */}
      <View style={styles.hintCard}>
        <Text style={styles.hintText}>
          {selectedGluePair
            ? `✨ Highlighted Edge #${selectedGluePair}: Match Front #${selectedGluePair} & Back #${selectedGluePair} to Side Strip #${selectedGluePair}!`
            : '💡 Tap any numbered blue circle (1..6) on the sheet to highlight matching edges!'}
        </Text>
      </View>

      {/* Print & Share Row */}
      <View style={styles.btnRow}>
        <CraftButton
          title="⬇ Share / Save PDF"
          variant="paper"
          loading={isSharing}
          onPress={onShare}
          style={{ flex: 1 }}
        />
        <CraftButton
          title="🖨️ Print Sheet"
          variant="alt"
          loading={isPrinting}
          onPress={onPrint}
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.btnRow}>
        <CraftButton
          title="‹ Back"
          variant="alt"
          onPress={onBack}
          style={{ flex: 0.65 }}
        />
        <CraftButton
          title="Start 7-Step Build Guide →"
          variant="primary"
          onPress={onNext}
          style={{ flex: 1.65 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  infoBadge: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 38, 32, 0.78)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  infoBadgeText: {
    color: Colors.inkOnMat,
    fontSize: 11,
    fontWeight: '700',
  },
  paperBtns: {
    flexDirection: 'row',
    gap: 5,
    width: 124,
  },
  paperBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#c8d3cf',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  paperBtnActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  paperBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.ink,
  },
  paperBtnTextActive: {
    color: Colors.ruler,
  },
  chipRow: {
    gap: 7,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(157, 184, 175, 0.42)',
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
  paperStage: {
    backgroundColor: '#0d1f1a',
    borderWidth: 2,
    borderColor: 'rgba(157, 184, 175, 0.35)',
    borderRadius: 18,
    paddingTop: 10,
    paddingBottom: 46,
    minHeight: 330,
    position: 'relative',
    alignItems: 'center',
  },
  paperScrollContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperFrame: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  artOverlay: {
    position: 'absolute',
    zIndex: 1,
  },
  aiLoadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  aiLoadingText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 18,
  },
  aiEmptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  aiEmptyText: {
    fontSize: 12,
    color: '#4b5a55',
    textAlign: 'center',
    lineHeight: 18,
  },
  warnMini: {
    backgroundColor: '#fef3c7',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
  },
  warnMiniText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78350f',
  },
  glassControls: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 38, 32, 0.84)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  glassBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  glassBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  hintCard: {
    backgroundColor: Colors.matCardBg,
    borderWidth: 1.5,
    borderColor: Colors.matCardBorder,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  hintText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.ruler,
    lineHeight: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
