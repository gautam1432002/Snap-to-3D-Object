import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { Colors, Typography } from '../../constants/theme';
import { CuttingMatBackground } from '../../components/CuttingMatBackground';
import { PaperSheet } from '../../components/PaperSheet';
import { ServerUrlModal } from '../../components/ServerUrlModal';
import { checkBackendHealth, DEMO_SAMPLES } from '../../services/api';
import { CreationItem, getSavedCreations } from '../../services/storage';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [backendUrl, setBackendUrl] = useState<string>('');
  const [creations, setCreations] = useState<CreationItem[]>([]);
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

  const ongoing = creations.find((c) => c.status === 'Building');

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
        {/* Header + Tappable Server Status Pill */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hand}>hello, maker! 👋</Text>
            <Text style={styles.heroTitle}>
              Snap an object.{'\n'}Craft it in 3D paper.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setServerModalOpen(true)}
            activeOpacity={0.8}
            style={[
              styles.statusPill,
              backendOnline ? styles.statusOnline : styles.statusOffline,
            ]}
          >
            <View
              style={[
                styles.statusDot,
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
            <Text style={styles.statusText} numberOfLines={1}>
              {backendOnline === null
                ? 'Checking...'
                : backendOnline
                ? 'Connected'
                : 'Offline — Set IP'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Prominent White Paper Scan Real Object CTA Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/workflow')}
        >
          <PaperSheet style={styles.scanCta}>
            <View style={styles.scanThumb}>
              <Text style={{ fontSize: 32 }}>📸</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scanTitle}>Scan Real Object</Text>
              <Text style={styles.scanDesc}>
                Snap or pick any photo to lift a sharp cutout, inspect it in Crisp 3D, and print exact-scale PDF sheets.
              </Text>
              <View style={styles.ctaPill}>
                <Text style={styles.ctaPillText}>
                  ✂️ Cutout → 🧊 Crisp 3D → 🖨️ PDF
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
            </View>
            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>Resume ›</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Compact 4-Sample Horizontal Strip */}
        <View style={styles.secHead}>
          <Text style={styles.secTitle}>Try a Sample Craft</Text>
          <Text style={styles.secHint}>Instant offline demo</Text>
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
                  <Text style={styles.tplSub}>{tpl.heightCm} cm</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* Recent Creations */}
        {creations.length > 0 && (
          <>
            <View style={styles.secHead}>
              <Text style={styles.secTitle}>Recent Crafts</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/creations')}>
                <Text style={styles.secLink}>See all ›</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              {creations.slice(0, 3).map((c) => {
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
                      <Text style={styles.recentSub}>{c.heightCm} cm • Crisp 3D</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{c.status}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <ServerUrlModal
        visible={serverModalOpen}
        onClose={() => setServerModalOpen(false)}
        onSaved={(newUrl, ok) => {
          setBackendUrl(newUrl);
          setBackendOnline(ok);
        }}
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  hand: {
    ...Typography.handwritten,
    fontSize: 21,
  },
  heroTitle: {
    ...Typography.hero,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 99,
    borderWidth: 1.2,
    marginTop: 4,
  },
  statusOnline: {
    backgroundColor: 'rgba(46, 196, 182, 0.16)',
    borderColor: 'rgba(46, 196, 182, 0.5)',
  },
  statusOffline: {
    backgroundColor: 'rgba(230, 57, 70, 0.18)',
    borderColor: 'rgba(230, 57, 70, 0.55)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: Colors.inkOnMat,
    fontSize: 11,
    fontWeight: '700',
  },
  scanCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
  },
  scanThumb: {
    width: 64,
    height: 76,
    borderRadius: 14,
    backgroundColor: '#e9f3ef',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#7ea698',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.ink,
  },
  scanDesc: {
    fontSize: 12,
    color: '#4b5a55',
    marginTop: 3,
    lineHeight: 17,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 3,
    paddingHorizontal: 10,
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
  stepPill: {
    backgroundColor: Colors.ruler,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
  },
  stepPillText: {
    fontSize: 11,
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
  secHint: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.sage,
  },
  secLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.ruler,
  },
  hScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  tplCard: {
    width: 104,
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
    width: 54,
    height: 54,
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
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.matCardBg,
    borderWidth: 1.5,
    borderColor: Colors.matCardBorder,
    borderRadius: 15,
    padding: 10,
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
  badge: {
    backgroundColor: Colors.statusReadyBg,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.statusReadyText,
  },
});
