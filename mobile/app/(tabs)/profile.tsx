import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { CuttingMatBackground } from '../../components/CuttingMatBackground';
import { PaperSheet } from '../../components/PaperSheet';
import { CraftButton } from '../../components/CraftButton';
import { TourModal } from '../../components/TourModal';
import { ServerUrlModal } from '../../components/ServerUrlModal';
import { checkBackendHealth, getActiveApiBaseUrl } from '../../services/api';
import {
  BadgeState,
  getBadges,
  getPaperPreference,
  getSavedCreations,
  getStats,
  setPaperPreference,
  UserStats,
} from '../../services/storage';

export default function ProfileScreen() {
  const [badges, setBadges] = useState<BadgeState>({
    firstCutout: false,
    puff3d: false,
    printer: false,
    masterFolder: false,
  });
  const [stats, setStats] = useState<UserStats>({ objectsScanned: 0, craftsBuilt: 0 });
  const [builtCount, setBuiltCount] = useState(0);
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [apiUrl, setApiUrl] = useState('');
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    const [b, s, p, list, url, health] = await Promise.all([
      getBadges(),
      getStats(),
      getPaperPreference(),
      getSavedCreations(),
      getActiveApiBaseUrl(),
      checkBackendHealth(),
    ]);
    setBadges(b);
    setStats(s);
    setPaperSize(p);
    setBuiltCount(Math.max(s.craftsBuilt, list.filter((c) => c.status === 'Built').length));
    setApiUrl(url);
    setIsOnline(health.ok);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handlePaper = async (pref: 'A4' | 'Letter') => {
    setPaperSize(pref);
    await setPaperPreference(pref);
  };

  const BADGE_DEFS = [
    { key: 'firstCutout' as const, em: '✂️', title: 'Subject Lifter', desc: 'Isolated your first PNG' },
    { key: 'puff3d' as const, em: '🧊', title: '3D Crafter', desc: 'Built a Crisp 3D model' },
    { key: 'printer' as const, em: '🖨️', title: 'Print Master', desc: 'Exported a printable sheet' },
    { key: 'masterFolder' as const, em: '🏆', title: 'Master Folder', desc: 'Finished a 7-step build' },
  ];

  const unlockedCount = BADGE_DEFS.filter((b) => badges[b.key]).length;

  return (
    <CuttingMatBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text style={styles.hand}>maker passport</Text>
            <Text style={styles.title}>Profile & Badges</Text>
          </View>

          {/* Maker Passport Card */}
          <PaperSheet style={styles.passportRow}>
            <View style={styles.avatarBox}>
              <Text style={{ fontSize: 26 }}>🎨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.passportName}>Paper Craft Maker</Text>
              <Text style={styles.passportStats}>
                {stats.objectsScanned} scanned • {builtCount} built
              </Text>
            </View>
          </PaperSheet>

          {/* Maker Badges Grid */}
          <View style={styles.secHead}>
            <Text style={styles.secTitle}>Maker Badges</Text>
            <Text style={styles.handSmall}>{unlockedCount} / 4</Text>
          </View>

          <View style={styles.badgeGrid}>
            {BADGE_DEFS.map((b) => {
              const unlocked = badges[b.key];
              return (
                <View
                  key={b.key}
                  style={[styles.badgeItem, unlocked && styles.badgeUnlocked]}
                >
                  <Text style={styles.badgeEm}>{b.em}</Text>
                  <Text style={styles.badgeTitle}>{b.title}</Text>
                  <Text style={styles.badgeDesc}>{b.desc}</Text>
                </View>
              );
            })}
          </View>

          {/* Settings Card */}
          <View style={styles.matCard}>
            <View style={styles.prefRow}>
              <Text style={styles.prefLabel}>📄 Default Paper Size</Text>
              <View style={styles.segBtns}>
                {(['A4', 'Letter'] as const).map((sz) => {
                  const active = paperSize === sz;
                  return (
                    <TouchableOpacity
                      key={sz}
                      onPress={() => handlePaper(sz)}
                      style={[styles.segBtn, active && styles.segBtnActive]}
                    >
                      <Text style={[styles.segText, active && styles.segTextActive]}>
                        {sz}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.serverRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prefLabel}>🔌 Backend Server URL</Text>
                <Text style={styles.serverSub} numberOfLines={1}>
                  {apiUrl} • {isOnline ? 'Online ✓' : 'Offline'}
                </Text>
              </View>
              <CraftButton
                title="Change IP"
                variant="paper"
                small
                onPress={() => setServerModalOpen(true)}
              />
            </View>

            <CraftButton
              title="🎓 Replay Beginner Tour"
              variant="alt"
              onPress={() => setTourOpen(true)}
            />
          </View>

          <View style={{ height: Spacing.bottomBarOffset }} />
        </ScrollView>

        <TourModal visible={tourOpen} onClose={() => setTourOpen(false)} />
        <ServerUrlModal
          visible={serverModalOpen}
          onClose={() => setServerModalOpen(false)}
          onSaved={(newUrl, ok) => {
            setApiUrl(newUrl);
            setIsOnline(ok);
          }}
        />
      </SafeAreaView>
    </CuttingMatBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 18,
    gap: 13,
  },
  hand: {
    ...Typography.handwritten,
    fontSize: 20,
  },
  handSmall: {
    ...Typography.handwritten,
    fontSize: 18,
  },
  title: {
    ...Typography.title1,
  },
  passportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: Colors.ruler,
    borderWidth: 2,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passportName: {
    fontSize: 16.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  passportStats: {
    fontSize: 12,
    color: '#4b5a55',
    marginTop: 2,
  },
  secHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.inkOnMat,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeItem: {
    width: '48.5%',
    borderRadius: 15,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(16, 38, 32, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(157, 184, 175, 0.25)',
    opacity: 0.55,
  },
  badgeUnlocked: {
    opacity: 1,
    borderColor: Colors.ruler,
    backgroundColor: 'rgba(244, 196, 48, 0.14)',
  },
  badgeEm: { fontSize: 24, marginBottom: 4 },
  badgeTitle: { fontSize: 12.5, fontWeight: '800', color: Colors.inkOnMat },
  badgeDesc: { fontSize: 10, color: Colors.sage, marginTop: 2, textAlign: 'center' },
  matCard: {
    backgroundColor: Colors.matCardBg,
    borderWidth: 1.5,
    borderColor: Colors.matCardBorder,
    borderRadius: 17,
    padding: 13,
    gap: 12,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  prefLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.inkOnMat,
  },
  segBtns: {
    flexDirection: 'row',
    gap: 5,
    width: 132,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#c8d3cf',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  segBtnActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  segText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.ink,
  },
  segTextActive: {
    color: Colors.ruler,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(157, 184, 175, 0.2)',
  },
  serverSub: {
    fontSize: 11,
    color: Colors.sage,
    marginTop: 2,
  },
});
