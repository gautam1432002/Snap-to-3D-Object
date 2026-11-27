import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import { Server } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { CuttingMatBackground } from '../../components/CuttingMatBackground';
import { PaperSheet } from '../../components/PaperSheet';
import { CraftButton } from '../../components/CraftButton';
import { ServerUrlModal } from '../../components/ServerUrlModal';
import { checkBackendHealth, DEMO_SAMPLES } from '../../services/api';
import { CreationItem, getSavedCreations, getStats, UserStats } from '../../services/storage';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const PASTEL_BARS: Array<[string, string]> = [
  ['#7DD3FC', '#38BDF8'], // Mon - sky blue
  ['#86EFAC', '#34D399'], // Tue - mint
  ['#F9A8D4', '#C084FC'], // Wed - pink-purple
  ['#FDBA74', '#FB923C'], // Thu - warm orange
  ['#C4B5FD', '#818CF8'], // Fri - lavender
  ['#93C5FD', '#3B82F6'], // Sat - bright blue
  ['#6EE7B7', '#10B981'], // Sun - fresh mint
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [creations, setCreations] = useState<CreationItem[]>([]);
  const [stats, setStats] = useState<UserStats>({ objectsScanned: 0, craftsBuilt: 0 });
  const [serverModalOpen, setServerModalOpen] = useState(false);

  const ringProgress = useSharedValue(0);

  const refreshData = useCallback(async () => {
    const [health, list, userStats] = await Promise.all([
      checkBackendHealth(),
      getSavedCreations(),
      getStats(),
    ]);
    setBackendOnline(health.ok);
    setCreations(list);
    setStats(userStats);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  // Weekly Goal metrics computed from local creations & stats
  const liftedCount = Math.max(stats.objectsScanned, creations.length);
  const builtCount = Math.max(stats.craftsBuilt, creations.filter((c) => c.status === 'Built').length);
  const weekGoalTarget = 5;
  const weekCompleted = Math.min(weekGoalTarget, Math.max(builtCount, creations.length > 0 ? Math.min(3, creations.length) : 0));
  const goalPct = Math.round((weekCompleted / weekGoalTarget) * 100);
  const streakDays = creations.length > 0 ? Math.min(14, Math.max(1, creations.length)) : 1;

  // SVG Ring animation
  const ringR = 37;
  const ringCirc = 2 * Math.PI * ringR;
  useEffect(() => {
    ringProgress.value = withTiming(Math.max(0.08, weekCompleted / weekGoalTarget), {
      duration: 750,
      easing: Easing.out(Easing.cubic),
    });
  }, [weekCompleted]);

  const animatedRingProps = useAnimatedProps(() => ({
    strokeDashoffset: ringCirc * (1 - ringProgress.value),
  }));

  // 7-day weekly activity calculation (Mon=0 .. Sun=6)
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  creations.forEach((c) => {
    if (!c.updatedAt) return;
    const d = new Date(c.updatedAt).getDay();
    const monFirst = d === 0 ? 6 : d - 1;
    dayCounts[monFirst] += 1;
  });
  const todayJs = new Date().getDay();
  const todayIdx = todayJs === 0 ? 6 : todayJs - 1;
  const maxDayCount = Math.max(3, ...dayCounts);

  const launchTemplate = (sampleId: string) => {
    router.push({
      pathname: '/workflow',
      params: { sampleId },
    });
  };

  return (
    <CuttingMatBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 28) + 8,
            paddingBottom: Math.max(insets.bottom, 16) + 102,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Greeting Bar */}
        <View style={styles.headerRow}>
          <View style={styles.greetingLeft}>
            <View style={styles.avatarCircle}>
              <Text style={{ fontSize: 22 }}>🎨</Text>
            </View>
            <View>
              <Text style={styles.greetingTitle}>Hey, Maker!</Text>
              <Text style={styles.greetingSub}>Ready to craft in 3D?</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setServerModalOpen(true)}
            activeOpacity={0.8}
            style={styles.serverCircleBtn}
            accessibilityLabel="Server Status"
          >
            <Server size={18} color={Colors.ink} strokeWidth={2.2} />
            <View
              style={[
                styles.liveDot,
                {
                  backgroundColor:
                    backendOnline === null
                      ? Colors.gold
                      : backendOnline
                      ? '#22C55E'
                      : Colors.cut,
                },
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* Royal-Blue Hero Stats Card */}
        <LinearGradient
          colors={[Colors.heroBlueStart, Colors.heroBlueEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroOverline}>✂️ Weekly Craft Goal</Text>
              <Text style={styles.heroCount}>
                {weekCompleted} <Text style={styles.heroTotal}>/ {weekGoalTarget}</Text>
              </Text>
              <Text style={styles.heroCaption}>Objects crafted this week</Text>
            </View>

            {/* Golden Circular Progress Ring */}
            <View style={styles.ringWrap}>
              <Svg width={92} height={92} viewBox="0 0 92 92">
                <Circle
                  cx={46}
                  cy={46}
                  r={ringR}
                  stroke="rgba(255,255,255,0.24)"
                  strokeWidth={8}
                  fill="none"
                />
                <AnimatedCircle
                  cx={46}
                  cy={46}
                  r={ringR}
                  stroke={Colors.gold}
                  strokeWidth={8}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${ringCirc} ${ringCirc}`}
                  animatedProps={animatedRingProps}
                  transform="rotate(-90 46 46)"
                />
              </Svg>
              <View style={styles.ringCenterIcon}>
                <Text style={{ fontSize: 22 }}>🧊</Text>
              </View>
              <View style={styles.pctBadge}>
                <Text style={styles.pctBadgeText}>{goalPct}%</Text>
              </View>
            </View>
          </View>

          {/* 3 Floating Pure-White Pill Chips */}
          <View style={styles.heroPillsRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>✂️ {liftedCount} Lifted</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>🧊 {builtCount} Built</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>🔥 {streakDays}d Streak</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Spotlight Scan CTA */}
        <PaperSheet style={styles.spotlightCard}>
          <Text style={styles.spotlightTitle}>Snap & Fold in 3D!</Text>
          <Text style={styles.spotlightSub}>
            Turn any real object into a razor-sharp 3D papercraft template.
          </Text>
          <CraftButton
            title="Scan Real Object"
            variant="primary"
            onPress={() => router.push('/workflow')}
            style={{ width: '100%' }}
          />
        </PaperSheet>

        {/* Instant 3D Samples Horizontal Strip */}
        <View style={styles.secHead}>
          <Text style={styles.secTitle}>Instant 3D Samples</Text>
          <Text style={styles.secHint}>Tap to preview</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScroll}
        >
          {DEMO_SAMPLES.map((s, idx) => {
            const tpl = SAMPLE_TEMPLATES[(s.sampleId || 'crossing') as keyof typeof SAMPLE_TEMPLATES];
            return (
              <Animated.View
                key={s.id}
                entering={FadeInDown.duration(280).delay(idx * 45).springify()}
              >
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={() => launchTemplate(tpl.id)}
                  style={styles.sampleCard}
                >
                  <View style={styles.sampleIconBg}>
                    <SvgXml xml={tpl.svgMarkup} width={50} height={50} />
                  </View>
                  <Text style={styles.sampleTitle} numberOfLines={1}>
                    {tpl.shortName}
                  </Text>
                  <Text style={styles.sampleMeta}>{tpl.heightCm} cm</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* Your Craft Activity Card (7 Pastel Capsule Bars) */}
        <PaperSheet style={styles.activityCard}>
          <View style={styles.activityHead}>
            <Text style={styles.activityTitle}>Your Craft Activity</Text>
            <Text style={styles.activitySub}>Last 7 days</Text>
          </View>

          <View style={styles.barsRow}>
            {WEEK_DAYS.map((day, i) => {
              const count = dayCounts[i];
              const visualRatio = count > 0 ? Math.max(0.32, count / maxDayCount) : 0.24 + (i % 3) * 0.14;
              const barH = Math.round(visualRatio * 74);
              const isToday = i === todayIdx;
              const colors = PASTEL_BARS[i];

              return (
                <View key={day} style={styles.barCol}>
                  <View style={styles.barSlot}>
                    {isToday && (
                      <View style={styles.activeCountPill}>
                        <Text style={styles.activeCountText}>{count}</Text>
                      </View>
                    )}
                    <LinearGradient
                      colors={colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[
                        styles.capsuleBar,
                        { height: barH, opacity: count > 0 || isToday ? 1 : 0.62 },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayLabel, isToday && styles.dayLabelActive]}>
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        </PaperSheet>
      </ScrollView>

      <ServerUrlModal
        visible={serverModalOpen}
        onClose={() => setServerModalOpen(false)}
        onSaved={(_, ok) => setBackendOnline(ok)}
      />
    </CuttingMatBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    gap: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.gold,
    borderWidth: 2.5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.skyShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#2A4E6E',
  },
  serverCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: Colors.skyShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  liveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  heroCard: {
    borderRadius: 28,
    padding: 18,
    gap: 14,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroOverline: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  heroCount: {
    fontSize: 38,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 42,
    marginTop: 4,
  },
  heroTotal: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  heroCaption: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  ringWrap: {
    width: 92,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringCenterIcon: {
    position: 'absolute',
    top: 32,
  },
  pctBadge: {
    position: 'absolute',
    bottom: 0,
    paddingVertical: 2,
    paddingHorizontal: 9,
    borderRadius: 99,
    backgroundColor: Colors.goldDeep,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  pctBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.white,
  },
  heroPillsRow: {
    flexDirection: 'row',
    gap: 7,
  },
  heroPill: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: 'center',
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.ink,
  },
  spotlightCard: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 8,
  },
  spotlightTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: Colors.ink,
    textAlign: 'center',
  },
  spotlightSub: {
    fontSize: 12.5,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  secHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  secTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
  },
  secHint: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
  },
  hScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  sampleCard: {
    width: 104,
    backgroundColor: Colors.white,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: Colors.skyShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  sampleIconBg: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: Colors.softSky,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  sampleTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  sampleMeta: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.muted,
    marginTop: 1,
  },
  activityCard: {
    gap: 14,
  },
  activityHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
  },
  activitySub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.muted,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 112,
    paddingTop: 20,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barSlot: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  activeCountPill: {
    position: 'absolute',
    top: -22,
    backgroundColor: Colors.fold,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 99,
  },
  activeCountText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  capsuleBar: {
    width: 22,
    borderRadius: 11,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
  },
  dayLabelActive: {
    color: Colors.fold,
    fontWeight: '800',
  },
});
