import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { Colors, Spacing, Typography } from '../../constants/theme';
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
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.secHead}>
            <View>
              <Text style={styles.hand}>your craft bench</Text>
              <Text style={styles.title}>My Creations</Text>
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
              <Text style={styles.emptyTitle}>Your craft bench is empty</Text>
              <Text style={styles.emptyDesc}>
                Scan any real-world object or start a template to see your saved 3D paper crafts here.
              </Text>
            </PaperSheet>
          ) : (
            <View style={{ gap: 11 }}>
              {creations.map((c) => {
                const tpl = c.sampleId
                  ? SAMPLE_TEMPLATES[c.sampleId as keyof typeof SAMPLE_TEMPLATES]
                  : null;
                const badgeStyle =
                  c.status === 'Built'
                    ? styles.pillEasy
                    : c.status === 'Building'
                    ? styles.pillMed
                    : styles.pillReady;
                const badgeTextStyle =
                  c.status === 'Built'
                    ? styles.textEasy
                    : c.status === 'Building'
                    ? styles.textMed
                    : styles.textReady;

                return (
                  <PaperSheet key={c.id} style={styles.cardRow}>
                    <View style={styles.thumbBox}>
                      {c.trimmedBase64 || c.trimmedUrl ? (
                        <Image
                          source={{ uri: c.trimmedBase64 || c.trimmedUrl || '' }}
                          style={{ width: 52, height: 56 }}
                          resizeMode="contain"
                        />
                      ) : tpl ? (
                        <SvgXml xml={tpl.svgMarkup} width={52} height={56} />
                      ) : (
                        <Text style={{ fontSize: 28 }}>✂️</Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <View style={styles.metaPills}>
                        <View style={styles.metaPill}>
                          <Text style={styles.metaPillText}>{c.heightCm}cm</Text>
                        </View>
                        <View style={styles.metaPill}>
                          <Text style={styles.metaPillText}>
                            {c.moldStyle === 'standee' ? 'Standee' : 'Crisp 3D'}
                          </Text>
                        </View>
                        <View style={[styles.metaPill, badgeStyle]}>
                          <Text style={[styles.metaPillText, badgeTextStyle]}>
                            {c.status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.btnRow}>
                        <CraftButton
                          title="Open"
                          small
                          onPress={() => openCreation(c)}
                          style={{ flex: 1 }}
                        />
                        <CraftButton
                          title="🗑️"
                          variant="paper"
                          small
                          onPress={() => setPendingDelete(c)}
                          style={{ flex: 0.45 }}
                        />
                      </View>
                    </View>
                  </PaperSheet>
                );
              })}
            </View>
          )}

          <View style={{ height: Spacing.bottomBarOffset }} />
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
              <Text style={styles.modalTitle}>Delete this creation?</Text>
              <Text style={styles.modalDesc}>
                This removes "{pendingDelete?.name}" from your craft bench.
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
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 26,
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  thumbBox: {
    width: 64,
    height: 70,
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
  pillReady: { backgroundColor: Colors.statusReadyBg },
  textEasy: { color: Colors.easyText },
  textMed: { color: Colors.medText },
  textReady: { color: Colors.statusReadyText },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
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
