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
import { Colors } from '../../constants/theme';
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

export default function SetupScreen() {
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
            paddingBottom: Math.max(insets.bottom, 16) + 102,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.setupTitle}>Studio Setup</Text>

        {/* Backend Vision Server Card */}
        <PaperSheet style={styles.card}>
          <Text style={styles.cardHeading}>🔌 Backend Vision Server URL</Text>
          <Text style={styles.cardSub}>
            Enter your PC's Wi-Fi IPv4 address running FastAPI on port 8000.
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
          <CraftButton
            title={testing ? 'Testing...' : 'Test Connection'}
            variant="primary"
            loading={testing}
            onPress={handleTestConnection}
          />
          <CraftButton
            title="Reset to Default IP"
            variant="soft"
            small
            onPress={handleResetUrl}
          />
        </PaperSheet>

        {/* Paper Size Card */}
        <PaperSheet style={styles.paperRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardHeading}>📄 Paper Format</Text>
            <Text style={styles.cardSub}>Scale for exported PDF sheets</Text>
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

        {/* Maker Badges Card */}
        <PaperSheet style={styles.card}>
          <View style={styles.statsHead}>
            <Text style={styles.cardHeading}>🏆 Maker Badges</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{unlockedCount} / 4</Text>
            </View>
          </View>
          <Text style={styles.cardSub}>
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
        </PaperSheet>
      </ScrollView>
    </CuttingMatBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  setupTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.white,
    textShadowColor: 'rgba(36, 107, 253, 0.45)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
    letterSpacing: -0.5,
  },
  card: {
    gap: 10,
  },
  cardHeading: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 17,
  },
  input: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.softSkyBorder,
    backgroundColor: Colors.softSky,
    color: Colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  statusBox: {
    padding: 9,
    borderRadius: 12,
  },
  statusOk: { backgroundColor: '#DCFCE7' },
  statusErr: { backgroundColor: Colors.dangerBg },
  statusText: { fontSize: 12, fontWeight: '700' },
  textOk: { color: '#166534' },
  textErr: { color: Colors.dangerText },
  paperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  segBtns: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: Colors.softSky,
    padding: 4,
    borderRadius: 999,
    width: 142,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  segBtnActive: {
    backgroundColor: Colors.black,
  },
  segText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
  },
  segTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  statsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countPill: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 99,
  },
  countPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#B45309',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 2,
  },
  badgeItem: {
    width: '48.3%',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: Colors.softSky,
    opacity: 0.52,
  },
  badgeUnlocked: {
    opacity: 1,
    backgroundColor: '#FEF9C3',
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  badgeEm: { fontSize: 24, marginBottom: 4 },
  badgeTitle: { fontSize: 12, fontWeight: '800', color: Colors.ink },
});
