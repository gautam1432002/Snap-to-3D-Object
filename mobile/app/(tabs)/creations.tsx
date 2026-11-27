import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { Trash2 } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { CuttingMatBackground } from '../../components/CuttingMatBackground';
import { PaperSheet } from '../../components/PaperSheet';
import { CraftButton } from '../../components/CraftButton';
import {
  CreationItem,
  deleteCreation,
  getPaperPreference,
  getSavedCreations,
} from '../../services/storage';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';

export default function VaultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [creations, setCreations] = useState<CreationItem[]>([]);
  const [paperPref, setPaperPref] = useState<'A4' | 'Letter'>('A4');
  const [pendingDelete, setPendingDelete] = useState<CreationItem | null>(null);

  const loadVault = useCallback(async () => {
    const [list, pref] = await Promise.all([getSavedCreations(), getPaperPreference()]);
    setCreations(list);
    setPaperPref(pref);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVault();
    }, [loadVault])
  );

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteCreation(pendingDelete.id);
    setCreations((prev) => prev.filter((c) => c.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  const openCreation = (item: CreationItem) => {
    router.push({
      pathname: '/workflow',
      params: {
        creationId: item.id,
        sampleId: item.sampleId || undefined,
      },
    });
  };

  const builtCount = creations.filter((c) => c.status === 'Built').length;

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
        <Text style={styles.vaultTitle}>Craft Vault</Text>

        {/* 3 Crisp White Summary Pills */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryText}>📦 {creations.length} Saved</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryText}>✅ {builtCount} Built</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryText}>📄 {paperPref}</Text>
          </View>
        </View>

        {creations.length === 0 ? (
          <PaperSheet style={styles.emptyCard}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>✂️</Text>
            <Text style={styles.emptyTitle}>Your Craft Vault is empty</Text>
            <Text style={styles.emptyDesc}>
              Tap the camera orb below to scan any object and save it here!
            </Text>
          </PaperSheet>
        ) : (
          <View style={styles.grid}>
            {creations.map((c, idx) => {
              const tpl = c.sampleId
                ? SAMPLE_TEMPLATES[c.sampleId as keyof typeof SAMPLE_TEMPLATES]
                : null;
              const isBuilt = c.status === 'Built';
              return (
                <Animated.View
                  key={c.id}
                  entering={FadeInDown.duration(280).delay(idx * 45).springify()}
                  style={styles.gridItem}
                >
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => openCreation(c)}
                  >
                    <PaperSheet style={styles.card}>
                      <TouchableOpacity
                        onPress={() => setPendingDelete(c)}
                        style={styles.delBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={14} color={Colors.dangerText} />
                      </TouchableOpacity>

                      <View style={styles.thumbBox}>
                        {c.trimmedBase64 || c.trimmedUrl ? (
                          <Image
                            source={{ uri: c.trimmedBase64 || c.trimmedUrl || '' }}
                            style={{ width: 84, height: 84 }}
                            resizeMode="contain"
                          />
                        ) : tpl ? (
                          <SvgXml xml={tpl.svgMarkup} width={84} height={84} />
                        ) : (
                          <Text style={{ fontSize: 34 }}>✂️</Text>
                        )}
                      </View>

                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {c.name}
                      </Text>

                      <View style={styles.cardMetaRow}>
                        <Text style={styles.cardMeta}>{c.heightCm} cm</Text>
                        <View
                          style={[
                            styles.statusTag,
                            isBuilt ? styles.tagBuilt : styles.tagReady,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusTagText,
                              isBuilt ? styles.textBuilt : styles.textReady,
                            ]}
                          >
                            {c.status}
                          </Text>
                        </View>
                      </View>
                    </PaperSheet>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Delete Confirm Modal */}
      <Modal
        visible={!!pendingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDelete(null)}
      >
        <View style={styles.backdrop}>
          <PaperSheet style={styles.modalCard}>
            <Text style={{ fontSize: 34, marginBottom: 6 }}>🗑️</Text>
            <Text style={styles.modalTitle}>Delete this craft?</Text>
            <Text style={styles.modalDesc}>
              Remove "{pendingDelete?.name}" from your Craft Vault?
            </Text>
            <View style={styles.modalBtnRow}>
              <CraftButton
                title="Cancel"
                variant="soft"
                small
                onPress={() => setPendingDelete(null)}
                style={{ flex: 1 }}
              />
              <CraftButton
                title="Delete"
                variant="danger"
                small
                onPress={confirmDelete}
                style={{ flex: 1 }}
              />
            </View>
          </PaperSheet>
        </View>
      </Modal>
    </CuttingMatBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  vaultTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.white,
    textShadowColor: 'rgba(36, 107, 253, 0.45)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
    letterSpacing: -0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: Colors.skyShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 18,
  },
  emptyTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  emptyDesc: {
    fontSize: 12.5,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 11,
  },
  gridItem: {
    width: '48.2%',
  },
  card: {
    padding: 11,
    gap: 8,
    position: 'relative',
  },
  delBtn: {
    position: 'absolute',
    top: 9,
    right: 9,
    zIndex: 4,
    padding: 6,
    borderRadius: 99,
    backgroundColor: Colors.dangerBg,
  },
  thumbBox: {
    height: 104,
    borderRadius: 18,
    backgroundColor: Colors.softSky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.ink,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.muted,
  },
  statusTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 99,
  },
  tagReady: { backgroundColor: '#DBEAFE' },
  tagBuilt: { backgroundColor: '#DCFCE7' },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textReady: { color: '#1D4ED8' },
  textBuilt: { color: '#15803D' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 34, 56, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 330,
    alignItems: 'center',
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.ink,
  },
  modalDesc: {
    fontSize: 12.5,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
});
