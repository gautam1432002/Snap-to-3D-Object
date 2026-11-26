import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Award, FileText, CheckCircle2 } from 'lucide-react-native';
import { Colors, Radii, Spacing, Typography } from '../../constants/theme';
import { BentoCard } from '../../components/BentoCard';
import {
  getBadges,
  getStats,
  getPaperPreference,
  setPaperPreference,
  BadgeState,
  UserStats,
} from '../../services/storage';

export default function BadgesScreen() {
  const [badges, setBadges] = useState<BadgeState>({
    firstCutout: false,
    puff3d: false,
    printer: false,
    masterFolder: false,
  });
  const [stats, setStats] = useState<UserStats>({ objectsScanned: 0, craftsBuilt: 0 });
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const b = await getBadges();
    const s = await getStats();
    const p = await getPaperPreference();
    setBadges(b);
    setStats(s);
    setPaperSize(p);
  };

  const handleTogglePaper = async (newPref: 'A4' | 'Letter') => {
    setPaperSize(newPref);
    await setPaperPreference(newPref);
  };

  const BADGE_DEFS = [
    {
      key: 'firstCutout' as const,
      emoji: '✂️',
      title: 'Subject Lifter',
      desc: 'Completed neural matting & subject cutout.',
      unlocked: badges.firstCutout || stats.objectsScanned > 0,
    },
    {
      key: 'puff3d' as const,
      emoji: '🧊',
      title: '3D Crafter',
      desc: 'Built a 3D extruded cardstock silhouette slab.',
      unlocked: badges.puff3d || stats.objectsScanned > 0,
    },
    {
      key: 'printer' as const,
      emoji: '🖨️',
      title: 'Print Master',
      desc: 'Downloaded a 300 DPI exact physical scale PDF.',
      unlocked: badges.printer,
    },
    {
      key: 'masterFolder' as const,
      emoji: '🏆',
      title: 'Master Folder',
      desc: 'Assembled all 7 steps of a physical paper model.',
      unlocked: badges.masterFolder || stats.craftsBuilt > 0,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.pageHandwritten}>maker achievements</Text>
            <Text style={styles.pageTitle}>BADGES & STATS</Text>
          </View>
        </View>

        {/* Stats Bento Card */}
        <BentoCard
          title="Maker Stats"
          subtitle="Your physical craft journey"
          icon={<Award size={18} color={Colors.ruler} />}
        >
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.objectsScanned + 4}</Text>
              <Text style={styles.statLabel}>Objects Scanned</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.craftsBuilt + 1}</Text>
              <Text style={styles.statLabel}>Crafts Built</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>180 gsm</Text>
              <Text style={styles.statLabel}>Preferred Paper</Text>
            </View>
          </View>
        </BentoCard>

        {/* Section: Badges Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Maker Badges</Text>
          <Text style={styles.sectionSubtitle}>
            {BADGE_DEFS.filter((b) => b.unlocked).length} of 4 Unlocked
          </Text>
        </View>

        <View style={styles.badgesGrid}>
          {BADGE_DEFS.map((b) => (
            <TouchableOpacity
              key={b.key}
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert(
                  b.title,
                  `${b.desc}\n\nStatus: ${b.unlocked ? 'Unlocked 🎉' : 'Locked 🔒'}`
                )
              }
              style={[
                styles.badgeCard,
                b.unlocked ? styles.badgeUnlocked : styles.badgeLocked,
              ]}
            >
              <View style={styles.badgeEmojiBox}>
                <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                {b.unlocked && (
                  <View style={styles.checkPill}>
                    <CheckCircle2 size={12} color={Colors.teal} />
                  </View>
                )}
              </View>

              <Text style={styles.badgeTitle}>{b.title}</Text>
              <Text style={styles.badgeDesc} numberOfLines={2}>
                {b.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section: Paper Size Preference */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Print Settings</Text>
        </View>

        <BentoCard
          title="Default Printing Paper"
          subtitle="All PDF exports align strictly to this standard."
          icon={<FileText size={18} color={Colors.teal} />}
        >
          <View style={styles.paperToggleRow}>
            <TouchableOpacity
              onPress={() => handleTogglePaper('A4')}
              style={[
                styles.paperBtn,
                paperSize === 'A4' && styles.paperBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.paperBtnText,
                  paperSize === 'A4' && styles.paperBtnTextActive,
                ]}
              >
                A4 (210 × 297 mm)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTogglePaper('Letter')}
              style={[
                styles.paperBtn,
                paperSize === 'Letter' && styles.paperBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.paperBtnText,
                  paperSize === 'Letter' && styles.paperBtnTextActive,
                ]}
              >
                Letter (8.5 × 11 in)
              </Text>
            </TouchableOpacity>
          </View>
        </BentoCard>

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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    ...Typography.title1,
    color: Colors.ruler,
    fontSize: 22,
  },
  statLabel: {
    ...Typography.caption,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title2,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.teal,
    fontWeight: '700',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  badgeCard: {
    width: '47.5%',
    backgroundColor: 'rgba(20, 26, 23, 0.75)',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  badgeUnlocked: {
    borderColor: 'rgba(46, 196, 182, 0.35)',
  },
  badgeLocked: {
    opacity: 0.55,
  },
  badgeEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  checkPill: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(16, 38, 32, 0.95)',
    borderRadius: 8,
    padding: 2,
  },
  badgeTitle: {
    ...Typography.title3,
    fontSize: 14,
    marginBottom: 4,
  },
  badgeDesc: {
    ...Typography.caption,
    fontSize: 11,
    lineHeight: 15,
  },
  paperToggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  paperBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  paperBtnActive: {
    backgroundColor: 'rgba(244, 196, 48, 0.15)',
    borderColor: Colors.ruler,
  },
  paperBtnText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.muted,
  },
  paperBtnTextActive: {
    color: Colors.ruler,
  },
});
