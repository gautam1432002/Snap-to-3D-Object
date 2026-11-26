import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { BookOpen, Scissors, Ruler, Layers, PenTool } from 'lucide-react-native';
import { Colors, Radii, Spacing, Typography } from '../../constants/theme';
import { BentoCard } from '../../components/BentoCard';

export default function GuideScreen() {
  const ASSEMBLY_STEPS = [
    {
      num: 1,
      badge: 'Print',
      title: 'Print at 100% (No Scaling)',
      desc: 'Use 180–220 gsm cardstock. Do NOT select "Fit to Page" in your printer dialog.',
      color: Colors.ruler,
    },
    {
      num: 2,
      badge: 'Cut',
      title: 'Cut Along Solid Red Lines',
      desc: 'Use craft scissors or a hobby knife. Cut the Front, Back, and side depth strips.',
      color: Colors.cut,
    },
    {
      num: 3,
      badge: 'Score',
      title: 'Pre-Score Blue Dashed Lines',
      desc: 'Run an empty ballpoint pen or scoring stylus along dashed lines before folding tabs.',
      color: Colors.fold,
    },
    {
      num: 4,
      badge: 'Match',
      title: 'Match Numbered Glue Circles',
      desc: 'Each numbered circle on the side strip matches the exact circle on the front face.',
      color: Colors.teal,
    },
    {
      num: 5,
      badge: 'Glue',
      title: 'Attach Side Strips to Front',
      desc: 'Apply a thin layer of PVA or glue stick to pink tabs. Hold for 20 seconds.',
      color: Colors.ruler,
    },
    {
      num: 6,
      badge: 'Seal',
      title: 'Seal With Mirrored Back Face',
      desc: 'Align the back face with the remaining side strip tabs to complete the 3D slab.',
      color: Colors.cut,
    },
    {
      num: 7,
      badge: 'Finish',
      title: 'Attach Desk Stand (Optional)',
      desc: 'Valley-fold the center line of the desk stand and slot the model upright.',
      color: Colors.teal,
    },
  ];

  const TOOLS = [
    { name: 'Craft Scissors', tip: 'Fine-tipped scissors for curved contours.', icon: <Scissors size={18} color={Colors.ruler} /> },
    { name: 'Metal Ruler', tip: 'Keeps score lines straight and crisp.', icon: <Ruler size={18} color={Colors.teal} /> },
    { name: '180–220 gsm Paper', tip: 'Standard paper is too soft; cardstock holds 3D volume.', icon: <Layers size={18} color={Colors.fold} /> },
    { name: 'Scoring Stylus', tip: 'Creases the paper without cutting fibers.', icon: <PenTool size={18} color={Colors.cut} /> },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.pageHandwritten}>crafter academy</Text>
            <Text style={styles.pageTitle}>ASSEMBLY GUIDE</Text>
          </View>
        </View>

        {/* Essential Tools Bento Card */}
        <BentoCard
          title="Essential Crafter Tools"
          subtitle="Everything you need for clean folds"
          icon={<BookOpen size={18} color={Colors.ruler} />}
        >
          <View style={styles.toolsGrid}>
            {TOOLS.map((tool, idx) => (
              <View key={idx} style={styles.toolItem}>
                <View style={styles.toolIconBox}>{tool.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toolName}>{tool.name}</Text>
                  <Text style={styles.toolTip}>{tool.tip}</Text>
                </View>
              </View>
            ))}
          </View>
        </BentoCard>

        {/* 7-Step Step-by-Step Guide */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>7-Step Assembly Protocol</Text>
          <Text style={styles.sectionBadge}>PROJECT_SPEC.md §4</Text>
        </View>

        {ASSEMBLY_STEPS.map((step) => (
          <BentoCard
            key={step.num}
            title={`${step.num}. ${step.title}`}
            subtitle={step.desc}
            badge={step.badge}
            badgeColor={step.color}
            icon={
              <View
                style={[
                  styles.stepNumberBadge,
                  { borderColor: step.color },
                ]}
              >
                <Text style={[styles.stepNumberText, { color: step.color }]}>
                  {step.num}
                </Text>
              </View>
            }
          />
        ))}

        <View style={{ height: Spacing.bottomBarOffset }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  topHeader: {
    marginBottom: Spacing.md,
  },
  pageHandwritten: {
    ...Typography.handwritten,
    fontSize: 20,
    color: Colors.ruler,
  },
  pageTitle: {
    ...Typography.hero,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  toolsGrid: {
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  toolIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolName: {
    ...Typography.title3,
    fontSize: 13,
  },
  toolTip: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    ...Typography.title2,
  },
  sectionBadge: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.teal,
    fontWeight: '700',
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
