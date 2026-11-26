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
import { Box, Trash2, ExternalLink, RefreshCw } from 'lucide-react-native';
import { Colors, Radii, Spacing, Typography } from '../../constants/theme';
import { BentoCard } from '../../components/BentoCard';
import { getSavedCreations, deleteCreation, CreationItem } from '../../services/storage';
import { DEMO_SAMPLES } from '../../services/api';

export default function CreationsScreen() {
  const router = useRouter();
  const [creations, setCreations] = useState<CreationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Building' | 'Built'>('All');

  useEffect(() => {
    loadCreations();
  }, []);

  const loadCreations = async () => {
    const list = await getSavedCreations();
    if (list.length === 0) {
      // Seed with demo samples for immediate enjoyment
      setCreations(DEMO_SAMPLES);
    } else {
      setCreations(list);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Model', `Are you sure you want to remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCreation(id);
          setCreations((prev) => prev.filter((c) => c.id !== id));
        },
      },
    ]);
  };

  const filtered = creations.filter((item) => {
    if (activeFilter === 'Building') return item.status === 'Building';
    if (activeFilter === 'Built') return item.status === 'Built';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.pageHandwritten}>your physical gallery</Text>
            <Text style={styles.pageTitle}>CREATIONS</Text>
          </View>
          <TouchableOpacity onPress={loadCreations} style={styles.refreshBtn}>
            <RefreshCw size={18} color={Colors.ruler} />
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['All', 'Building', 'Built'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterPill,
                activeFilter === filter && styles.activeFilterPill,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.activeFilterText,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Creations List */}
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Box size={48} color={Colors.muted} />
            <Text style={styles.emptyTitle}>No Models in this filter</Text>
            <Text style={styles.emptySubtitle}>
              Start a new scan from the Studio to build your 3D papercraft collection.
            </Text>
          </View>
        ) : (
          filtered.map((item) => {
            const statusColor =
              item.status === 'Built'
                ? Colors.teal
                : item.status === 'Building'
                ? Colors.ruler
                : Colors.fold;

            return (
              <BentoCard
                key={item.id}
                title={item.name}
                subtitle={`${item.category} • ${item.heightCm} cm • ${item.moldStyle}`}
                badge={item.status}
                badgeColor={statusColor}
                icon={
                  <Text style={{ fontSize: 20 }}>
                    {item.sampleId === 'crossing'
                      ? '🚸'
                      : item.sampleId === 'sneaker'
                      ? '👟'
                      : item.sampleId === 'fox'
                      ? '🦊'
                      : '🧋'}
                  </Text>
                }
                rightElement={
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id, item.name)}
                    style={styles.trashBtn}
                  >
                    <Trash2 size={16} color={Colors.muted} />
                  </TouchableOpacity>
                }
              >
                {/* Progress bar if in progress */}
                <View style={styles.progressSection}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressLabel}>
                      Step {item.buildStep} of {item.totalSteps}
                    </Text>
                    <Text style={styles.progressPercent}>
                      {Math.round((item.buildStep / item.totalSteps) * 100)}% Complete
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.max(
                            8,
                            (item.buildStep / item.totalSteps) * 100
                          )}%`,
                          backgroundColor: statusColor,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/workflow',
                        params: {
                          sampleId: item.sampleId || undefined,
                          creationId: item.id,
                        },
                      })
                    }
                  >
                    <ExternalLink size={14} color={Colors.ink} />
                    <Text style={styles.openBtnText}>Open Blueprint</Text>
                  </TouchableOpacity>
                </View>
              </BentoCard>
            );
          })
        )}

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
    marginBottom: Spacing.md,
  },
  pageHandwritten: {
    ...Typography.handwritten,
    fontSize: 20,
    color: Colors.ruler,
  },
  pageTitle: {
    ...Typography.hero,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeFilterPill: {
    backgroundColor: 'rgba(244, 196, 48, 0.16)',
    borderColor: Colors.ruler,
  },
  filterText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.muted,
  },
  activeFilterText: {
    color: Colors.ruler,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: Spacing.md,
  },
  emptyTitle: {
    ...Typography.title2,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  trashBtn: {
    padding: 6,
  },
  progressSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.ink,
    fontWeight: '600',
  },
  progressPercent: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.muted,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  openBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
  },
});
