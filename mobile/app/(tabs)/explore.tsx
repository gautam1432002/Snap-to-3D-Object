import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { CuttingMatBackground } from '../../components/CuttingMatBackground';
import { PaperSheet } from '../../components/PaperSheet';
import { CraftButton } from '../../components/CraftButton';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';

const CATEGORIES = ['All', 'Easy', 'Signs', 'Style', 'Animals', 'Drinks'] as const;

export default function ExploreScreen() {
  const router = useRouter();
  const [activeCat, setActiveCat] = useState<string>('All');
  const [showTip, setShowTip] = useState(false);

  const items = Object.values(SAMPLE_TEMPLATES).filter(
    (s) => activeCat === 'All' || s.tags.includes(activeCat)
  );

  return (
    <CuttingMatBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.secHead}>
            <View>
              <Text style={styles.hand}>ready to fold</Text>
              <Text style={styles.title}>Explore Templates</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowTip((v) => !v)}
              style={styles.infoBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.infoBtnText}>i</Text>
            </TouchableOpacity>
          </View>

          {showTip && (
            <View style={styles.infoDrawer}>
              <Text style={styles.infoText}>
                💡 <Text style={{ fontWeight: '800' }}>Beginner tip:</Text> Every template uses your exact cutout artwork on both Front & Back plus a matching perimeter Side Depth Strip so it looks just like the real object!
              </Text>
            </View>
          )}

          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {CATEGORIES.map((cat) => {
              const active = activeCat === cat;
              const label =
                cat === 'Easy'
                  ? '😊 Easy'
                  : cat === 'Signs'
                  ? '🚸 Signs'
                  : cat === 'Style'
                  ? '👟 Style'
                  : cat === 'Animals'
                  ? '🦊 Animals'
                  : cat === 'Drinks'
                  ? '🧋 Drinks'
                  : 'All';
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setActiveCat(cat)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Paper Cards List */}
          <View style={{ gap: 11 }}>
            {items.map((tpl) => (
              <PaperSheet key={tpl.id} style={styles.exploreCard}>
                <View style={styles.exploreIcon}>
                  <SvgXml xml={tpl.svgMarkup} width={52} height={52} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{tpl.name}</Text>
                  <View style={styles.metaPills}>
                    <View
                      style={[
                        styles.metaPill,
                        tpl.difficulty === 'Easy' ? styles.pillEasy : styles.pillMed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.metaPillText,
                          tpl.difficulty === 'Easy' ? styles.textEasy : styles.textMed,
                        ]}
                      >
                        {tpl.difficulty}
                      </Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>⏱ {tpl.estMinutes} min</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>📄 2 sheets</Text>
                    </View>
                  </View>
                </View>

                <CraftButton
                  title="Craft"
                  small
                  onPress={() =>
                    router.push({
                      pathname: '/workflow',
                      params: { sampleId: tpl.id },
                    })
                  }
                />
              </PaperSheet>
            ))}
          </View>

          <View style={{ height: Spacing.bottomBarOffset }} />
        </ScrollView>
      </SafeAreaView>
    </CuttingMatBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 18,
    gap: 12,
  },
  secHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hand: {
    ...Typography.handwritten,
    fontSize: 20,
  },
  title: {
    ...Typography.title1,
  },
  infoBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnText: {
    color: Colors.ruler,
    fontSize: 13,
    fontWeight: '800',
  },
  infoDrawer: {
    backgroundColor: 'rgba(16, 38, 32, 0.94)',
    borderWidth: 1.5,
    borderColor: Colors.ruler,
    borderRadius: 14,
    padding: 11,
  },
  infoText: {
    color: Colors.inkOnMat,
    fontSize: 12,
    lineHeight: 18,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(157, 184, 175, 0.42)',
    backgroundColor: 'rgba(16, 38, 32, 0.68)',
  },
  chipActive: {
    backgroundColor: Colors.ruler,
    borderColor: Colors.ink,
  },
  chipText: {
    color: Colors.inkOnMat,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.ink,
    fontWeight: '800',
  },
  exploreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  exploreIcon: {
    width: 62,
    height: 68,
    borderRadius: 13,
    backgroundColor: '#edf5f1',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#9db8af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.ink,
  },
  metaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  metaPill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 99,
    backgroundColor: '#e8f1ee',
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.ink,
  },
  pillEasy: { backgroundColor: Colors.easyBg },
  pillMed: { backgroundColor: Colors.medBg },
  textEasy: { color: Colors.easyText },
  textMed: { color: Colors.medText },
});
