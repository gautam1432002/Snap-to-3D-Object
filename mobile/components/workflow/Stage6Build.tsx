import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Check, Award } from 'lucide-react-native';
import { Colors, Radii, Spacing } from '../../constants/theme';
import { BentoCard } from '../BentoCard';

interface Stage6BuildProps {
  completedSteps: number[];
  glueTimerSec: number;
  isTimerRunning: boolean;
  onToggleStep: (stepNum: number) => void;
  onStartTimer: () => void;
  onFinish: () => void;
}

const BUILD_STEPS = [
  { num: 1, title: 'Print at 100%', desc: 'No Fit-to-Page scaling. Check 50mm ruler.' },
  { num: 2, title: 'Cut Red Outlines', desc: 'Carefully cut Front, Back & Strips.' },
  { num: 3, title: 'Score Blue Dashed Lines', desc: 'Pre-crease all glue tabs.' },
  { num: 4, title: 'Match Numbered Circles', desc: 'Match circle 1 on strip to circle 1 on front.' },
  { num: 5, title: 'Glue Side Strips to Front', desc: 'Apply thin PVA layer & hold.' },
  { num: 6, title: 'Seal Mirrored Back', desc: 'Attach back face to remaining tabs.' },
  { num: 7, title: 'Slot Desk Stand', desc: 'Valley fold stand & place upright.' },
];

export function Stage6Build({
  completedSteps,
  glueTimerSec,
  isTimerRunning,
  onToggleStep,
  onStartTimer,
  onFinish,
}: Stage6BuildProps) {
  return (
    <View style={styles.container}>
      {/* 20s Glue Timer Card */}
      <BentoCard
        title="20s Glue Setting Timer"
        subtitle="Hold glued paper tabs firmly until countdown reaches zero"
      >
        <View style={styles.timerCircleBox}>
          <Text style={styles.timerSecText}>{glueTimerSec}s</Text>
          <Text style={styles.timerSubText}>{isTimerRunning ? 'BONDING TABS...' : 'READY'}</Text>
        </View>

        <TouchableOpacity
          onPress={onStartTimer}
          disabled={isTimerRunning}
          style={[styles.timerStartBtn, isTimerRunning && { opacity: 0.6 }]}
        >
          <Clock size={18} color="#0D1210" />
          <Text style={styles.timerStartText}>
            {isTimerRunning ? 'Timer Active...' : 'Start 20s Glue Timer'}
          </Text>
        </TouchableOpacity>
      </BentoCard>

      {/* Build Steps Checklist */}
      <Text style={styles.sectionLabel}>Physical Build Steps</Text>
      {BUILD_STEPS.map((step) => {
        const done = completedSteps.includes(step.num);
        return (
          <TouchableOpacity
            key={step.num}
            onPress={() => onToggleStep(step.num)}
            activeOpacity={0.7}
            style={[styles.stepItem, done && styles.stepItemDone]}
          >
            <View style={[styles.stepCheckbox, done && styles.stepCheckboxDone]}>
              {done && <Check size={14} color="#0D1210" strokeWidth={3} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepItemTitle, done && styles.stepItemTitleDone]}>
                Step {step.num}: {step.title}
              </Text>
              <Text style={styles.stepItemDesc}>{step.desc}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Finish & Save Button */}
      <TouchableOpacity onPress={onFinish} style={styles.finishCraftBtn}>
        <LinearGradient colors={[Colors.teal, '#1E8278']} style={styles.btnGradient}>
          <Award size={20} color="#0D1210" />
          <Text style={styles.btnPrimaryText}>Finish & Save to Creations</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  timerCircleBox: {
    height: 120,
    backgroundColor: '#0F1614',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timerSecText: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.ruler,
  },
  timerSubText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  timerStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Colors.ruler,
  },
  timerStartText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D1210',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  stepItemDone: {
    backgroundColor: 'rgba(20, 184, 166, 0.06)',
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  stepCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheckboxDone: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  stepItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  stepItemTitleDone: {
    color: Colors.teal,
  },
  stepItemDesc: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  finishCraftBtn: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    marginTop: Spacing.lg,
  },
  btnGradient: {
    height: 54,
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
