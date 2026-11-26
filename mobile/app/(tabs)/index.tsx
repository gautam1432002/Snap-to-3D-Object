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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Sparkles, Image as ImageIcon, ArrowRight, Zap, CheckCircle2 } from 'lucide-react-native';
import { Colors, Radii, Spacing, Typography } from '../../constants/theme';
import { BentoCard } from '../../components/BentoCard';
import { FeedbackBanner } from '../../components/FeedbackBanner';
import { checkBackendHealth, DEMO_SAMPLES } from '../../services/api';
import { saveCreation, CreationItem } from '../../services/storage';

export default function StudioScreen() {
  const router = useRouter();
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    const res = await checkBackendHealth();
    setIsBackendOnline(res.ok);
  };

  const handleStartSample = async (sample: CreationItem) => {
    setSelectedSample(sample.id);
    await saveCreation({
      ...sample,
      id: `proj_${Date.now()}`,
      updatedAt: Date.now(),
    });
    router.push({
      pathname: '/workflow',
      params: { sampleId: sample.sampleId || undefined },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top App Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.brandHandwritten}>hello, maker!</Text>
            <Text style={styles.brandTitle}>FOLDLY STUDIO</Text>
          </View>

          {/* Backend Connection Status Badge */}
          <TouchableOpacity onPress={checkHealth} activeOpacity={0.7} style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isBackendOnline ? Colors.teal : Colors.ruler },
              ]}
            />
            <Text style={styles.statusText}>
              {isBackendOnline === null
                ? 'Connecting...'
                : isBackendOnline
                ? 'API Online'
                : 'Demo Mode'}
            </Text>
          </TouchableOpacity>
        </View>

        {!isBackendOnline && isBackendOnline !== null && (
          <FeedbackBanner
            type="warning"
            message="Backend server offline. Foldly is running in Demo Mode with built-in 3D papercraft models."
            actionText="Retry"
            onAction={checkHealth}
          />
        )}

        {/* Hero Scan Bento Card */}
        <BentoCard
          gradientColors={['rgba(27, 58, 49, 0.95)', 'rgba(16, 38, 32, 0.98)']}
          style={styles.heroCard}
        >
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroTag}>
              <Sparkles size={12} color={Colors.ruler} />
              <Text style={styles.heroTagText}>AI 3D PAPERCRAFT</Text>
            </View>
            <Text style={styles.heroDifficulty}>A4 & Letter Ready</Text>
          </View>

          <Text style={styles.heroTitle}>Snap ANY Real Object</Text>
          <Text style={styles.heroSubtitle}>
            Transform your toys, sneakers, or mugs into physical 3D papercraft toy sculptures.
          </Text>

          {/* Shutter / Scan Action Button */}
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.primaryScanBtn}
              onPress={() => router.push('/workflow')}
            >
              <LinearGradient
                colors={[Colors.ruler, '#D4A017']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.scanBtnGradient}
              >
                <Camera size={20} color="#0D1210" strokeWidth={2.4} />
                <Text style={styles.scanBtnText}>Start New Scan</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.secondaryUploadBtn}
              onPress={() =>
                router.push({
                  pathname: '/workflow',
                  params: { autoPick: 'gallery' },
                })
              }
            >
              <ImageIcon size={20} color={Colors.ink} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </BentoCard>

        {/* Section: Quick Start Samples Carousel */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ready-Made Templates</Text>
          <Text style={styles.sectionAction}>4 Built-in Models</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
        >
          {DEMO_SAMPLES.map((sample) => (
            <TouchableOpacity
              key={sample.id}
              activeOpacity={0.8}
              onPress={() => handleStartSample(sample)}
              style={styles.templateCard}
            >
              <View
                style={[
                  styles.templateVisualBox,
                  { borderColor: sample.edgeColorHex || Colors.ruler },
                ]}
              >
                <Text style={styles.sampleEmoji}>
                  {sample.sampleId === 'crossing'
                    ? '🚸'
                    : sample.sampleId === 'sneaker'
                    ? '👟'
                    : sample.sampleId === 'fox'
                    ? '🦊'
                    : '🧋'}
                </Text>
                <View style={styles.templatePill}>
                  <Text style={styles.templatePillText}>{sample.category}</Text>
                </View>
              </View>

              <Text style={styles.templateName} numberOfLines={1}>
                {sample.name}
              </Text>
              <View style={styles.templateMetaRow}>
                <Text style={styles.templateHeight}>{sample.heightCm} cm</Text>
                <View style={styles.templateBadge}>
                  <Text style={styles.templateBadgeText}>
                    {sample.moldStyle === 'block' ? 'Crisp 3D' : 'Standee'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section: How Foldly Works (3-Step Bento) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>How Foldly Works</Text>
        </View>

        <BentoCard
          title="1. Neural Lift & Contour"
          subtitle="Isolate your subject with server-side AI and clean edge denoising."
          icon={<Zap size={18} color={Colors.teal} />}
        />

        <BentoCard
          title="2. Crisp 3D Cardstock Slab"
          subtitle="Generate true-to-life 3D extruded silhouette mesh with front and back textures."
          icon={<Sparkles size={18} color={Colors.ruler} />}
        />

        <BentoCard
          title="3. Exact-Scale 300 DPI PDF"
          subtitle="Print on A4 or Letter, cut the red lines, fold the blue dashed lines, and glue."
          icon={<CheckCircle2 size={18} color={Colors.fold} />}
        />

        {/* Bottom spacing to clear floating tab bar */}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  brandHandwritten: {
    ...Typography.handwritten,
    fontSize: 20,
    color: Colors.ruler,
  },
  brandTitle: {
    ...Typography.hero,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
  },
  heroCard: {
    borderWidth: 1.5,
    borderColor: 'rgba(46, 196, 182, 0.3)',
    marginBottom: Spacing.xl,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244, 196, 48, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(244, 196, 48, 0.3)',
  },
  heroTagText: {
    ...Typography.tag,
    color: Colors.ruler,
  },
  heroDifficulty: {
    ...Typography.caption,
    color: Colors.sage,
  },
  heroTitle: {
    ...Typography.hero,
    fontSize: 26,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.muted,
    marginBottom: Spacing.lg,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  primaryScanBtn: {
    flex: 1,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  scanBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  scanBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D1210',
  },
  secondaryUploadBtn: {
    width: 50,
    height: 50,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionAction: {
    ...Typography.caption,
    color: Colors.ruler,
    fontWeight: '700',
  },
  carouselContainer: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  templateCard: {
    width: 140,
    backgroundColor: 'rgba(20, 26, 23, 0.75)',
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  templateVisualBox: {
    height: 100,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(16, 38, 32, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  sampleEmoji: {
    fontSize: 40,
  },
  templatePill: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  templatePillText: {
    fontSize: 9,
    color: Colors.ink,
    fontWeight: '700',
  },
  templateName: {
    ...Typography.title3,
    fontSize: 13,
    marginBottom: 4,
  },
  templateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateHeight: {
    ...Typography.caption,
    fontSize: 11,
  },
  templateBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radii.xs,
  },
  templateBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.sage,
  },
});
