import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography } from '../../constants/theme';
import { CuttingMatBackground } from '../../components/CuttingMatBackground';
import { PaperSheet } from '../../components/PaperSheet';
import { CraftButton } from '../../components/CraftButton';
import {
  checkBackendHealth,
  getActiveApiBaseUrl,
  getEnvDefaultApiUrl,
  saveActiveApiBaseUrl,
} from '../../services/api';
import {
  BadgeState,
  getBadges,
  getPaperPreference,
  getSavedCreations,
  getStats,
  setPaperPreference,
  UserStats,
} from '../../services/storage';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [urlInput, setUrlInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [connMsg, setConnMsg] = useState<string | null>(null);
  const [connOk, setConnOk] = useState<boolean>(false);

  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [badges, setBadges] = useState<BadgeState>({
    firstCutout: false,
    crisp3d: false,
    printer: false,
    masterFolder: false,
  });
  const [stats, setStats] = useState<UserStats>({ objectsScanned: 0, craftsBuilt: 0 });
  const [builtCount, setBuiltCount] = useState(0);

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
    setUrlInput(url);
    setConnOk(health.ok);
    setConnMsg(health.ok ? `Connected (${health.statusText})` : `Offline (${health.statusText})`);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleTestConnection = async () => {
    const clean = urlInput.trim().replace(/\/+$/, '');
    if (!clean) {
      setConnOk(false);
      setConnMsg('Enter a valid URL like http://192.168.1.5:8000');
      return;
    }
    setTesting(true);
    await saveActiveApiBaseUrl(clean);
    const res = await checkBackendHealth(clean);
    setTesting(false);
    setConnOk(res.ok);
    setConnMsg(
      res.ok
        ? `Connected to ${res.url} (${res.statusText})`
        : `Cannot reach ${res.url}: ${res.statusText}`
    );
  };

  const handleResetUrl = async () => {
    const def = getEnvDefaultApiUrl();
    setUrlInput(def);
    await saveActiveApiBaseUrl(null);
    const res = await checkBackendHealth(def);
    setConnOk(res.ok);
    setConnMsg(res.ok ? `Reset & connected to ${def}` : `Reset to ${def} (${res.statusText})`);
  };

  const handlePaper = async (pref: 'A4' | 'Letter') => {
    setPaperSize(pref);
    await setPaperPreference(pref);
  };

  const BADGE_DEFS = [
    { key: 'firstCutout' as const, em: '✂️', title: 'Subject Lifter' },
    { key: 'crisp3d' as const, em: '🧊', title: 'Crisp 3D' },
    { key: 'printer' as const, em: '🖨️', title: 'Print Master' },
    { key: 'masterFolder' as const, em: '🏆', title: 'Master Folder' },
  ];

  const unlockedCount = BADGE_DEFS.filter((b) => badges[b.key]).length;

  return (
    <CuttingMatBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 28) + 8,
            paddingBottom: Math.max(insets.bottom, 14) + 96,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.hand}>studio config</Text>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Backend Server URL Card */}
        <PaperSheet style={styles.card}>
          <Text style={styles.cardHeading}>🔌 Backend Server URL</Text>
          <Text style={styles.cardSub}>
            Enter your PC's Wi-Fi IP address with FastAPI running on port 8000.
          </Text>
          <TextInput
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="http://192.168.1.5:8000"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          {connMsg && (
            <View style={[styles.statusBox, connOk ? styles.statusOk : styles.statusErr]}>
              <Text style={[styles.statusText, connOk ? styles.textOk : styles.textErr]}>
                {connMsg}
              </Text>
            </View>
          )}
          <View style={styles.btnRow}>
            <CraftButton
              title="Reset"
              variant="paper"
              small
              onPress={handleResetUrl}
              style={{ flex: 0.7 }}
            />
            <CraftButton
              title={testing ? 'Testing...' : 'Test Connection'}
              variant="teal"
              small
              loading={testing}
              onPress={handleTestConnection}
              style={{ flex: 1.4 }}
            />
          </View>
        </PaperSheet>

        {/* Paper Size Card */}
        <PaperSheet style={styles.paperRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardHeading}>📄 Printing Paper</Text>
            <Text style={styles.cardSub}>Used for exact-scale PDF export</Text>
          </View>
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
        </PaperSheet>

        {/* Compact Stats & Badges Card */}
        <View style={styles.matCard}>
          <View style={styles.statsHead}>
            <Text style={styles.statsTitle}>🎨 Maker Stats & Badges</Text>
            <Text style={styles.handSmall}>{unlockedCount} / 4</Text>
          </View>
          <Text style={styles.statsSub}>
            {stats.objectsScanned} objects scanned • {builtCount} crafts built
          </Text>

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
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </CuttingMatBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
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
  card: {
    gap: 9,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.ink,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 17,
  },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#cbd5d1',
    backgroundColor: '#ffffff',
    color: Colors.ink,
    fontSize: 13.5,
    fontWeight: '600',
  },
  statusBox: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1.2,
  },
  statusOk: { backgroundColor: '#d4f5ee', borderColor: Colors.teal },
  statusErr: { backgroundColor: '#fee2e2', borderColor: Colors.cut },
  statusText: { fontSize: 11.5, fontWeight: '700' },
  textOk: { color: '#0f5c52' },
  textErr: { color: '#991b1b' },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  segBtns: {
    flexDirection: 'row',
    gap: 5,
    width: 132,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
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
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
  },
  segTextActive: {
    color: Colors.ruler,
  },
  matCard: {
    backgroundColor: Colors.matCardBg,
    borderWidth: 1.5,
    borderColor: Colors.matCardBorder,
    borderRadius: 17,
    padding: 13,
    gap: 8,
  },
  statsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.inkOnMat,
  },
  statsSub: {
    fontSize: 12,
    color: Colors.sage,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  badgeItem: {
    width: '48.5%',
    borderRadius: 13,
    paddingVertical: 10,
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
  badgeEm: { fontSize: 22, marginBottom: 3 },
  badgeTitle: { fontSize: 12, fontWeight: '800', color: Colors.inkOnMat },
});
