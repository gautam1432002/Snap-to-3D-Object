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
import { Colors, Typography } from '../../constants/theme';
import { CuttingMatBackground } from '../../components/CuttingMatBackground';
import { PaperSheet } from '../../components/PaperSheet';
import { CraftButton } from '../../components/CraftButton';
import {
  CreationItem,
  deleteCreation,
  getSavedCreations,
} from '../../services/storage';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';

export default function CreationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [creations, setCreations] = useState<CreationItem[]>([]);
  const [pendingDelete, setPendingDelete] = useState<CreationItem | null>(null);

  const loadCreations = useCallback(async () => {
    const list = await getSavedCreations();
    setCreations(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCreations();
    }, [loadCreations])
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
        <View style={styles.secHead}>
          <View>
            <Text style={styles.hand}>your craft bench</Text>
            <Text style={styles.title}>Creations</Text>
          </View>
          <CraftButton
            title="+ Scan New"
            small
            onPress={() => router.push('/workflow')}
          />
        </View>

        {creations.length === 0 ? (
          <PaperSheet style={styles.emptyCard}>
            <Text style={{ fontSize: 38, marginBottom: 8 }}>✂️</Text>
            <Text style={styles.emptyTitle}>No saved crafts yet</Text>
            <Text style={styles.emptyDesc}>
              Scan a real object or try a sample craft to see your saved 3D models here.
            </Text>
          </PaperSheet>
        ) : (
          <View style={styles.grid}>
            {creations.map((c, idx) => {
              const tpl = c.sampleId
                ? SAMPLE_TEMPLATES[c.sampleId as keyof typeof SAMPLE_TEMPLATES]
                : null;
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
                        <Trash2 size={14} color={Colors.cut} />
                      </TouchableOpacity>

                      <View style={styles.thumbBox}>
                        {c.trimmedBase64 || c.trimmedUrl ? (
                          <Image
                            source={{ uri: c.trimmedBase64 || c.trimmedUrl || '' }}
                            style={{ width: 82, height: 82 }}
                            resizeMode="contain"
                          />
                        ) : tpl ? (
                          <SvgXml xml={tpl.svgMarkup} width={82} height={82} />
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
                            c.status === 'Built'
                              ? styles.tagBuilt
                              : c.status === 'Building'
                              ? styles.tagBuilding
                              : styles.tagReady,
                          ]}
                        >
                          <Text style={styles.statusTagText}>{c.status}</Text>
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
              Remove "{pendingDelete?.name}" from your saved creations?
            </Text>
            <View style={styles.modalBtnRow}>
              <CraftButton
                title="Cancel"
                variant="paper"
                onPress={() => setPendingDelete(null)}
                style={{ flex: 1 }}
              />
              <CraftButton
                title="Delete"
                variant="danger"
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
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
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
    gap: 10,
  },
  gridItem: {
    width: '48.2%',
  },
  card: {
    padding: 10,
    gap: 7,
    position: 'relative',
  },
  delBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 4,
    padding: 5,
    borderRadius: 99,
    backgroundColor: '#fee2e2',
  },
  thumbBox: {
    height: 98,
    borderRadius: 12,
    backgroundColor: '#edf5f1',
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: '#9db8af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
  },
  statusTag: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 99,
  },
  tagReady: { backgroundColor: Colors.statusReadyBg },
  tagBuilding: { backgroundColor: Colors.medBg },
  tagBuilt: { backgroundColor: Colors.easyBg },
  statusTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Colors.ink,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 20, 16, 0.76)',
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
