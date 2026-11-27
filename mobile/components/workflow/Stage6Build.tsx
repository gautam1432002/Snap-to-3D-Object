import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Svg, { Rect, Line, Circle, Path, Text as SvgText } from 'react-native-svg';
import { Colors, Typography } from '../../constants/theme';
import { PaperSheet } from '../PaperSheet';
import { CraftButton } from '../CraftButton';

interface Stage6BuildProps {
  modelName: string;
  paperSize: 'A4' | 'Letter';
  moldStyle: 'block' | 'standee';
  includeStand: boolean;
  buildTip?: string;
  buildStepIdx: number; // 0..6
  glueTimerSec: number;
  isTimerRunning: boolean;
  onChangeStep: (idx: number) => void;
  onStartTimer: () => void;
  onFinish: () => void;
}

const TOOL_TIPS: Record<string, string> = {
  scissors: '✂️ Scissors: Follow the solid red outline gently—the small white margin makes cutting easy!',
  ruler: '📏 Ruler: Press a ruler on every dashed blue fold line and trace with a dull pen to score crisp folds.',
  glue: '🧴 Glue stick: Apply a thin even coat on the pink glue tabs and hold for 20 seconds so it bonds tight.',
  scoring: '🖊️ Scoring Pen: Use a dry ballpoint pen along a ruler to make ultra-sharp 90° paper edges!',
  paper: '📄 180gsm Cardstock: Standard printer paper works for small crafts, while 180gsm cardstock makes standees rock-solid.',
};

export function Stage6Build({
  modelName,
  paperSize,
  moldStyle,
  includeStand,
  buildTip,
  buildStepIdx,
  glueTimerSec,
  isTimerRunning,
  onChangeStep,
  onStartTimer,
  onFinish,
}: Stage6BuildProps) {
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [warnStep, setWarnStep] = useState<number | null>(null);
  const [activeTool, setActiveTool] = useState<string>('scissors');

  const steps = [
    {
      badge: 'Print',
      title: 'Print at 100% Actual Size',
      desc: `Print your ${paperSize} sheets at 100% scale (turn OFF "Fit to Page"). Check that the yellow Scale Check ruler measures exactly 5 cm.`,
      check: 'I checked that the yellow scale bar is 5 cm',
      warn: '⚠️ Wait! If "Fit to Page" shrinks Page 2 differently, the Side Depth Strip may not match the Front & Back.',
    },
    {
      badge: 'Cut',
      title: `Cut Out ${modelName} Front & Back`,
      desc: 'Carefully cut along the solid red outlines around the Front Artwork, Mirrored Back Artwork, and the Side Depth Strips.',
    },
    {
      badge: 'Score',
      title: 'Score & Fold the Blue Dashed Lines',
      desc: 'Place a ruler along every dashed blue line on the Side Depth Strip and crease all the small pink glue tabs inward at 90°.',
      check: 'I pre-folded the glue tabs along the blue dashed lines',
      warn: '⚠️ Tip: Pre-folding the glue tabs BEFORE adding glue makes assembly 3x cleaner and faster!',
    },
    {
      badge: 'Match',
      title: 'Match the Numbered Glue Tabs',
      desc: 'Line up circle #1 on the Side Depth Strip with circle #1 on the Front Artwork. Dry-fit the strip around the edges first.',
    },
    {
      badge: 'Glue',
      title: 'Glue the Side Strip to the Front',
      desc: `Apply glue to 2–3 tabs at a time and press firmly to the back edge of the Front Artwork. ${buildTip || ''}`,
      hasTimer: true,
    },
    {
      badge: 'Seal',
      title: 'Glue the Mirrored Back Artwork',
      desc: 'Apply glue to the remaining side strip tabs and press the Mirrored Back Artwork cleanly into place for a crisp 3D finish.',
      hasTimer: true,
    },
    {
      badge: 'Finish!',
      title: includeStand ? 'Attach the Fold-Out Desk Stand!' : `Display Your 3D ${modelName}!`,
      desc: includeStand
        ? 'Fold the Desk Stand 90° along its blue line and glue the bottom flap under your model so it stands proudly on your desk!'
        : `Awesome job, maker! Your real-world ${modelName} is now a finished crisp 3D paper-craft sculpture.`,
    },
  ];

  const cur = steps[buildStepIdx] || steps[0];
  const pct = Math.round(((buildStepIdx + 1) / steps.length) * 100);

  const renderDiagram = () => {
    if (buildStepIdx === 0) {
      return (
        <Svg width={160} height={84} viewBox="0 0 160 84">
          <Rect x={35} y={10} width={90} height={64} rx={6} fill="#fff" stroke="#17201d" strokeWidth={2.5} />
          <Rect x={48} y={24} width={64} height={12} fill="#f4c430" stroke="#17201d" strokeWidth={1.5} />
          <SvgText x={80} y={54} textAnchor="middle" fontSize="11" fontWeight="800" fill="#17201d">
            100% SCALE ✓
          </SvgText>
        </Svg>
      );
    }
    if (buildStepIdx === 1) {
      return (
        <Svg width={160} height={84} viewBox="0 0 160 84">
          <Rect x={26} y={14} width={44} height={56} rx={8} fill="#fff" stroke="#e63946" strokeWidth={2.5} />
          <Rect x={90} y={14} width={44} height={56} rx={8} fill="#fff" stroke="#e63946" strokeWidth={2.5} />
          <SvgText x={80} y={48} textAnchor="middle" fontSize="22">
            ✂️
          </SvgText>
        </Svg>
      );
    }
    if (buildStepIdx === 2) {
      return (
        <Svg width={160} height={84} viewBox="0 0 160 84">
          <Rect x={20} y={26} width={120} height={32} fill="#d4f5ee" stroke="#3b78f0" strokeWidth={2.5} strokeDasharray="6 4" />
          <Line x1={60} y1={26} x2={60} y2={58} stroke="#3b78f0" strokeWidth={2} strokeDasharray="4 3" />
          <Line x1={100} y1={26} x2={100} y2={58} stroke="#3b78f0" strokeWidth={2} strokeDasharray="4 3" />
        </Svg>
      );
    }
    if (buildStepIdx === 3) {
      return (
        <Svg width={160} height={84} viewBox="0 0 160 84">
          <Circle cx={52} cy={42} r={16} fill="#3b78f0" />
          <SvgText x={52} y={47} textAnchor="middle" fill="#fff" fontWeight="800" fontSize="14">
            1
          </SvgText>
          <Path d="M72 42h16" stroke="#17201d" strokeWidth={3} strokeDasharray="3 3" />
          <Circle cx={108} cy={42} r={16} fill="#f4c430" stroke="#17201d" strokeWidth={2} />
          <SvgText x={108} y={47} textAnchor="middle" fill="#17201d" fontWeight="800" fontSize="14">
            1
          </SvgText>
        </Svg>
      );
    }
    if (buildStepIdx === 4) {
      return (
        <Svg width={160} height={84} viewBox="0 0 160 84">
          <Rect x={44} y={16} width={72} height={52} rx={10} fill="#fde7e9" stroke="#e63946" strokeWidth={2.5} />
          <SvgText x={80} y={48} textAnchor="middle" fontSize="24">
            🧴
          </SvgText>
        </Svg>
      );
    }
    if (buildStepIdx === 5) {
      return (
        <Svg width={160} height={84} viewBox="0 0 160 84">
          <Rect x={42} y={16} width={76} height={52} rx={8} fill="#d4f5ee" stroke="#17201d" strokeWidth={2.5} />
          <SvgText x={80} y={48} textAnchor="middle" fontSize="22">
            🧊
          </SvgText>
        </Svg>
      );
    }
    return (
      <Svg width={160} height={84} viewBox="0 0 160 84">
        <SvgText x={80} y={54} textAnchor="middle" fontSize="40">
          🎉
        </SvgText>
      </Svg>
    );
  };

  const handleNext = () => {
    if (cur.check && !checkedSteps[buildStepIdx] && warnStep !== buildStepIdx) {
      setWarnStep(buildStepIdx);
      return;
    }
    setWarnStep(null);
    if (buildStepIdx < steps.length - 1) {
      onChangeStep(buildStepIdx + 1);
    } else {
      onFinish();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.secHead}>
        <Text style={styles.hand}>
          Step {buildStepIdx + 1} of {steps.length}
        </Text>
        <View style={styles.modelPill}>
          <Text style={styles.modelPillText}>
            {moldStyle === 'standee' ? '🪧 3D Standee' : '🧊 Crisp 3D'}
          </Text>
        </View>
      </View>

      {/* Progress Track */}
      <View style={styles.progTrack}>
        <View style={[styles.progFill, { width: `${pct}%` }]} />
      </View>

      {/* Main Build Step Paper Card */}
      <PaperSheet style={styles.stepCard}>
        <View style={styles.stepTop}>
          <Text style={styles.stepNum}>{buildStepIdx + 1}</Text>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>{cur.badge}</Text>
          </View>
        </View>

        <View style={styles.diagramBox}>{renderDiagram()}</View>

        <View>
          <Text style={styles.stepTitle}>{cur.title}</Text>
          <Text style={styles.stepDesc}>{cur.desc}</Text>
        </View>

        {cur.check && (
          <TouchableOpacity
            onPress={() => {
              setCheckedSteps((p) => ({ ...p, [buildStepIdx]: !p[buildStepIdx] }));
              setWarnStep(null);
            }}
            style={styles.checkRow}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkbox,
                checkedSteps[buildStepIdx] && styles.checkboxChecked,
              ]}
            >
              {checkedSteps[buildStepIdx] && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>{cur.check}</Text>
          </TouchableOpacity>
        )}

        {warnStep === buildStepIdx && cur.warn && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnText}>
              {cur.warn} (Tap Next again to continue anyway)
            </Text>
          </View>
        )}

        {cur.hasTimer && (
          <CraftButton
            title={
              isTimerRunning
                ? `⏳ Hold firmly... ${glueTimerSec}s`
                : glueTimerSec === 0
                  ? '✅ Bonded! Tap to run 20s again'
                  : '⏱️ Start 20-Second Glue Hold Timer'
            }
            variant="paper"
            onPress={onStartTimer}
            disabled={isTimerRunning}
            style={{ backgroundColor: '#e8f0fe', borderColor: Colors.fold }}
          />
        )}
      </PaperSheet>

      {/* Tool Tip Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {(
          [
            { id: 'scissors', label: '✂️ Scissors' },
            { id: 'ruler', label: '📏 Ruler' },
            { id: 'glue', label: '🧴 Glue stick' },
            { id: 'scoring', label: '🖊️ Scoring Pen' },
            { id: 'paper', label: '📄 180gsm Paper' },
          ]
        ).map((tool) => {
          const active = activeTool === tool.id;
          return (
            <TouchableOpacity
              key={tool.id}
              onPress={() => setActiveTool(tool.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {tool.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.toolTipCard}>
        <Text style={styles.toolTipText}>{TOOL_TIPS[activeTool]}</Text>
      </View>

      {/* Prev / Next Row */}
      <View style={styles.btnRow}>
        <CraftButton
          title="‹ Previous"
          variant="alt"
          disabled={buildStepIdx === 0}
          onPress={() => {
            setWarnStep(null);
            if (buildStepIdx > 0) onChangeStep(buildStepIdx - 1);
          }}
          style={{ flex: 0.9 }}
        />
        <CraftButton
          title={buildStepIdx === steps.length - 1 ? '🎉 Finish Craft' : 'Next Step ›'}
          variant="primary"
          onPress={handleNext}
          style={{ flex: 1.4 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  secHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hand: {
    ...Typography.handwritten,
    fontSize: 20,
  },
  modelPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 38, 32, 0.78)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  modelPillText: {
    color: Colors.inkOnMat,
    fontSize: 11,
    fontWeight: '700',
  },
  progTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: Colors.mat2,
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: Colors.ruler,
  },
  stepCard: {
    gap: 10,
  },
  stepTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNum: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.fold,
    lineHeight: 38,
  },
  stepBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: Colors.ruler,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.ink,
  },
  diagramBox: {
    backgroundColor: '#f1f6f4',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#c4d4ce',
    borderRadius: 14,
    height: 106,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  stepDesc: {
    fontSize: 12.5,
    color: '#4b5a55',
    lineHeight: 18,
    marginTop: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#eaf4f0',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 11,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.8,
    borderColor: Colors.mat,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.mat,
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  checkLabel: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.ink,
  },
  warnBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 11,
    padding: 8,
  },
  warnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#78350f',
    lineHeight: 16,
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
  toolTipCard: {
    backgroundColor: Colors.matCardBg,
    borderWidth: 1.5,
    borderColor: Colors.matCardBorder,
    borderRadius: 14,
    padding: 10,
  },
  toolTipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.ruler,
    lineHeight: 16.5,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
