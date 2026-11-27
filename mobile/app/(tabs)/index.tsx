import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { CuttingMatBackground } from '../../components/CuttingMatBackground';
import { PaperSheet } from '../../components/PaperSheet';
import { TourModal } from '../../components/TourModal';
import { ServerUrlModal } from '../../components/ServerUrlModal';
import { checkBackendHealth, DEMO_SAMPLES } from '../../services/api';
import {
  CreationItem,
  getOnboardingDone,
  getSavedCreations,
  setOnboardingDone,
} from '../../services/storage';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';

export default function HomeScreen() {
  const router = useRouter();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [backendUrl, setBackendUrl] = useState<string>('');
  const [creations, setCreations] = useState<CreationItem[]>([]);
  const [tourOpen, setTourOpen] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);

  const refreshData = useCallback(async () => {
    const [health, list] = await Promise.all([
      checkBackendHealth(),
      getSavedCreations(),
    ]);
    setBackendOnline(health.ok);
    setBackendUrl(health.url);
    setCreations(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  useEffect(() => {
    getOnboardingDone().then((done) => {
      if (!done) setTourOpen(true);
    });
  }, []);

  const ongoing = creations.find((c) => c.status === 'Building');

  const handleCloseTour = async () => {
    setTourOpen(false);
    await setOnboardingDone(true);
  };

  const launchTemplate = (sampleId: string) => {
    router.push({
      pathname: '/workflow',
      params: { sampleId },
    });
  };

  const openSavedCreation = (c: CreationItem) => {
    router.push({
      pathname: '/workflow',
      params: {
        creationId: c.id,
        sampleId: c.sampleId || undefined,
      },
    });
  };

  return (
    <CuttingMatBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hand}>hello, maker! 👋</Text>
              <Text style={styles.heroTitle}>
                Snap an object.{'\n'}Craft it in 3D paper.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setTourOpen(true)}
              style={styles.guidePill}
              activeOpacity={0.8}
            >
              <Text style={styles.guidePillText}>🎓 Guide</Text>
            </TouchableOpacity>
          </View>

          {/* Tappable Backend Connection Pill */}
          <TouchableOpacity
            onPress={() => setServerModalOpen(true)}
            activeOpacity={0.8}
            style={[
              styles.connPill,
              backendOnline ? styles.connOnline : styles.connOffline,
            ]}
          >
            <View
              style={[
                styles.connDot,
                {
                  backgroundColor:
                    backendOnline === null
                      ? Colors.ruler
                      : backendOnline
                      ? Colors.teal
                      : Colors.cut,
                },
              ]}
            />
            <Text style={styles.connText} numberOfLines={1}>
              {backendOnline === null
                ? 'Checking FastAPI...'
                : backendOnline
                ? `Backend Online • ${backendUrl}`
                : `Offline (${backendUrl}) — Tap to configure IP`}
            </Text>
            <Text style={styles.connEdit}>Edit ›</Text>
          </TouchableOpacity>

          {/* Prominent White Paper Scan an Object CTA Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/workflow')}
          >
            <PaperSheet style={styles.scanCta}>
              <View style={styles.scanThumb}>
                <Text style={{ fontSize: 30 }}>📸</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scanTitle}>Scan an Object</Text>
                <Text style={styles.scanDesc}>
                  Snap ANY photo! Neural lift isolates the object, Gemini builds the crisp model & draws its cutout sheet.
                </Text>
                <View style={styles.ctaPill}>
                  <Text style={styles.ctaPillText}>
                    ✨ Neural Lift → Gemini Cutout → 3D
                  </Text>
                </View>
              </View>
            </PaperSheet>
          </TouchableOpacity>

          {/* Dynamic Continue Building Banner */}
          {ongoing && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openSavedCreation(ongoing)}
              style={styles.continueCard}
            >
              <View style={styles.continueThumb}>
                {ongoing.trimmedBase64 || ongoing.trimmedUrl ? (
                  <Image
                    source={{ uri: ongoing.trimmedBase64 || ongoing.trimmedUrl || '' }}
                    style={{ width: 38, height: 38 }}
                    resizeMode="contain"
                  />
                ) : ongoing.sampleId && SAMPLE_TEMPLATES[ongoing.sampleId as keyof typeof SAMPLE_TEMPLATES] ? (
                  <SvgXml
                    xml={SAMPLE_TEMPLATES[ongoing.sampleId as keyof typeof SAMPLE_TEMPLATES].svgMarkup}
                    width={38}
                    height={38}
                  />
                ) : (
                  <Text style={{ fontSize: 22 }}>✂️</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.continueOverline}>CONTINUE BUILDING</Text>
                <Text style={styles.continueTitle} numberOfLines={1}>
                  {ongoing.name}
                </Text>
                <View style={styles.progMini}>
                  <View
                    style={[
                      styles.progMiniFill,
                      {
                        width: `${Math.min(
                          100,
                          Math.round(((ongoing.buildStep + 1) / (ongoing.totalSteps || 7)) * 100)
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.stepPill}>
                <Text style={styles.stepPillText}>
                  Step {Math.min(ongoing.buildStep + 1, ongoing.totalSteps || 7)}/{ongoing.totalSteps || 7}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* How Foldly Works 3-Step Strip */}
          <View style={styles.secHead}>
            <Text style={styles.secTitle}>How Foldly works</Text>
            <TouchableOpacity onPress={() => setTourOpen(true)}>
              <Text style={styles.secLink}>Watch tour ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.howGrid}>
            <View style={styles.howStep}>
              <Text style={styles.howEmoji}>✂️</Text>
              <Text style={styles.howBold}>1. Subject Lift</Text>
              <Text style={styles.howSub}>Neural + GrabCut</Text>
            </View>
            <View style={styles.howStep}>
              <Text style={styles.howEmoji}>🧊</Text>
              <Text style={styles.howBold}>2. Crisp 3D</Text>
              <Text style={styles.howSub}>Exact silhouette</Text>
            </View>
            <View style={styles.howStep}>
              <Text style={styles.howEmoji}>🖨️</Text>
              <Text style={styles.howBold}>3. Print & Craft</Text>
              <Text style={styles.howSub}>A4 / Letter PDF</Text>
            </View>
          </View>

          {/* Ready-Made Templates Carousel */}
          <View style={styles.secHead}>
            <Text style={styles.secTitle}>Ready-made templates</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.secLink}>Explore all ›</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {DEMO_SAMPLES.map((s) => {
              const tpl = SAMPLE_TEMPLATES[(s.sampleId || 'crossing') as keyof typeof SAMPLE_TEMPLATES];
              return (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.85}
                  onPress={() => launchTemplate(tpl.id)}
                  style={styles.tplCard}
                >
                  <View style={styles.tplSvgWrap}>
                    <SvgXml xml={tpl.svgMarkup} width={54} height={54} />
                  </View>
                  <Text style={styles.tplTitle} numberOfLines={1}>
                    {tpl.shortName}
                  </Text>
                  <Text style={styles.tplSub}>
                    {tpl.difficulty} • {tpl.estMinutes}m
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Recent Creations */}
          <View style={styles.secHead}>
            <Text style={styles.secTitle}>Recent creations</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/creations')}>
              <Text style={styles.secLink}>See all ›</Text>
            </TouchableOpacity>
          </View>

          {creations.length === 0 ? (
            <View style={styles.matCard}>
              <Text style={styles.emptyText}>
                No paper crafts yet—tap <Text style={{ fontWeight: '800', color: Colors.inkOnMat }}>Scan an Object</Text> or pick a template above!
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {creations.slice(0, 3).map((c) => {
                const badgeBg =
                  c.status === 'Built'
                    ? Colors.statusBuiltBg
                    : c.status === 'Building'
                    ? Colors.statusBuildingBg
                    : Colors.statusReadyBg;
                const badgeTxt =
                  c.status === 'Built'
                    ? Colors.statusBuiltText
                    : c.status === 'Building'
                    ? Colors.statusBuildingText
                    : Colors.statusReadyText;
                const tpl = c.sampleId
                  ? SAMPLE_TEMPLATES[c.sampleId as keyof typeof SAMPLE_TEMPLATES]
                  : null;

                return (
                  <TouchableOpacity
                    key={c.id}
                    activeOpacity={0.85}
                    onPress={() => openSavedCreation(c)}
                    style={styles.recentRow}
                  >
                    <View style={styles.recentThumb}>
                      {c.trimmedBase64 || c.trimmedUrl ? (
                        <Image
                          source={{ uri: c.trimmedBase64 || c.trimmedUrl || '' }}
                          style={{ width: 34, height: 34 }}
                          resizeMode="contain"
                        />
                      ) : tpl ? (
                        <SvgXml xml={tpl.svgMarkup} width={34} height={34} />
                      ) : (
                        <Text style={{ fontSize: 20 }}>✂️</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.recentSub}>
                        {c.heightCm}cm • {c.moldStyle === 'standee' ? 'Standee' : 'Crisp 3D'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.statusBadgeText, { color: badgeTxt }]}>
                        {c.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: Spacing.bottomBarOffset }} />
        </ScrollView>

        <TourModal visible={tourOpen} onClose={handleCloseTour} />
        <ServerUrlModal
          visible={serverModalOpen}
          onClose={() => setServerModalOpen(false)}
          onSaved={(newUrl, ok) => {
            setBackendUrl(newUrl);
            setBackendOnline(ok);
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  hand: {
    ...Typography.handwritten,
    fontSize: 21,
  },
  heroTitle: {
    ...Typography.hero,
    marginTop: 2,
  },
  guidePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 38, 32, 0.72)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  guidePillText: {
    color: Colors.inkOnMat,
    fontSize: 11.5,
    fontWeight: '700',
  },
  connPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1.2,
  },
  connOnline: {
    backgroundColor: 'rgba(46, 196, 182, 0.14)',
    borderColor: 'rgba(46, 196, 182, 0.45)',
  },
  connOffline: {
    backgroundColor: 'rgba(230, 57, 70, 0.16)',
    borderColor: 'rgba(230, 57, 70, 0.5)',
  },
  connDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.inkOnMat,
  },
  connEdit: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.ruler,
  },
  scanCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scanThumb: {
    width: 62,
    height: 74,
    borderRadius: 13,
    backgroundColor: '#e9f3ef',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#7ea698',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  scanDesc: {
    fontSize: 12,
    color: '#4b5a55',
    marginTop: 2,
    lineHeight: 16.5,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 99,
    backgroundColor: Colors.ruler,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  ctaPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(46, 196, 182, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(46, 196, 182, 0.55)',
    borderRadius: 16,
    padding: 10,
  },
  continueThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.teal,
  },
  continueTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.inkOnMat,
  },
  progMini: {
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
    marginTop: 5,
  },
  progMiniFill: {
    height: '100%',
    backgroundColor: Colors.ruler,
  },
  stepPill: {
    backgroundColor: Colors.ruler,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 99,
  },
  stepPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  secHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  secTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.inkOnMat,
  },
  secLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.ruler,
  },
  howGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  howStep: {
    flex: 1,
    backgroundColor: 'rgba(16, 38, 32, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(157, 184, 175, 0.25)',
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  howEmoji: { fontSize: 18, marginBottom: 3 },
  howBold: { fontSize: 11, fontWeight: '800', color: Colors.inkOnMat },
  howSub: { fontSize: 9.5, color: Colors.sage, marginTop: 1 },
  hScroll: {
    gap: 9,
    paddingVertical: 2,
  },
  tplCard: {
    width: 106,
    backgroundColor: Colors.paper,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 15,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  tplSvgWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tplTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  tplSub: {
    fontSize: 10,
    color: Colors.muted,
    marginTop: 1,
  },
  matCard: {
    backgroundColor: Colors.matCardBg,
    borderWidth: 1.5,
    borderColor: Colors.matCardBorder,
    borderRadius: 16,
    padding: 13,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.sage,
    textAlign: 'center',
    lineHeight: 18,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.matCardBg,
    borderWidth: 1.5,
    borderColor: Colors.matCardBorder,
    borderRadius: 16,
    padding: 11,
  },
  recentThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.inkOnMat,
  },
  recentSub: {
    fontSize: 11,
    color: Colors.sage,
    marginTop: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 99,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
});
