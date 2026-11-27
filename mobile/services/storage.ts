import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { ContourPoint } from '../utils/sampleTemplates';

export interface CreationItem {
  id: string;
  name: string;
  category: string;
  thumbUrl?: string | null;
  previewUrl?: string | null;
  trimmedUrl?: string | null;
  polishedUrl?: string | null;
  sheetUrl?: string | null;
  trimmedBase64?: string | null;
  polishedBase64?: string | null;
  sheetBase64?: string | null;
  status: 'Ready' | 'Building' | 'Built';
  buildStep: number;
  totalSteps: number;
  heightCm: number;
  depthCm: number;
  includeStand?: boolean;
  sampleId?: string | null;
  updatedAt: number;
  edgeColorHex?: string;
  difficulty?: string;
  estMinutes?: number;
  buildTip?: string;
  engineUsed?: string | null;
  aiSource?: string | null;
  aiWarning?: string | null;
  contour?: {
    points: ContourPoint[];
    perimeterMm: number;
    edgeColorHex: string;
    smoothness: string;
  };
}

export interface BadgeState {
  firstCutout: boolean;  // ✂️ Subject Lifter
  crisp3d: boolean;      // 🧊 Crisp 3D Crafter
  printer: boolean;      // 🖨️ Print Master
  masterFolder: boolean; // 🏆 Master Folder
}

export interface UserStats {
  objectsScanned: number;
  craftsBuilt: number;
}

const STORAGE_KEYS = {
  DEVICE_ID: '@foldly_device_id',
  CREATIONS: '@foldly_creations',
  BADGES: '@foldly_badges',
  STATS: '@foldly_stats',
  PAPER_SIZE: '@foldly_paper_size',
  API_URL_OVERRIDE: '@foldly_api_url',
};

export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (existing) return existing;
    const newId = `dev_${Crypto.randomUUID()}`;
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, newId);
    return newId;
  } catch {
    return 'dev_fallback_guest';
  }
}

export async function getApiUrlOverride(): Promise<string | null> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.API_URL_OVERRIDE);
    return val ? val.trim().replace(/\/+$/, '') : null;
  } catch {
    return null;
  }
}

export async function setApiUrlOverride(url: string | null): Promise<void> {
  try {
    if (!url || !url.trim()) {
      await AsyncStorage.removeItem(STORAGE_KEYS.API_URL_OVERRIDE);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.API_URL_OVERRIDE, url.trim().replace(/\/+$/, ''));
    }
  } catch (err) {
    console.warn('Failed to save API URL override:', err);
  }
}

export async function getSavedCreations(): Promise<CreationItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CREATIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCreation(item: CreationItem): Promise<void> {
  try {
    const list = await getSavedCreations();
    const filtered = list.filter((c) => c.id !== item.id);
    const updated = [item, ...filtered].slice(0, 18);
    await AsyncStorage.setItem(STORAGE_KEYS.CREATIONS, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save creation:', err);
  }
}

export async function updateCreation(id: string, updates: Partial<CreationItem>): Promise<void> {
  try {
    const list = await getSavedCreations();
    const updated = list.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c));
    await AsyncStorage.setItem(STORAGE_KEYS.CREATIONS, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to update creation:', err);
  }
}

export async function deleteCreation(id: string): Promise<void> {
  try {
    const list = await getSavedCreations();
    const updated = list.filter((c) => c.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.CREATIONS, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to delete creation:', err);
  }
}

export async function getBadges(): Promise<BadgeState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BADGES);
    if (!raw) {
      return { firstCutout: false, crisp3d: false, printer: false, masterFolder: false };
    }
    const parsed = JSON.parse(raw);
    return {
      firstCutout: !!parsed.firstCutout,
      crisp3d: Boolean(parsed.crisp3d ?? parsed.puff3d),
      printer: !!parsed.printer,
      masterFolder: !!parsed.masterFolder,
    };
  } catch {
    return { firstCutout: false, crisp3d: false, printer: false, masterFolder: false };
  }
}

export async function unlockBadge(key: keyof BadgeState): Promise<void> {
  try {
    const current = await getBadges();
    if (!current[key]) {
      current[key] = true;
      await AsyncStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(current));
    }
  } catch (err) {
    console.warn('Failed to unlock badge:', err);
  }
}

export async function checkAndUnlockBadges(stage: number, status?: string): Promise<void> {
  try {
    if (stage >= 2) await unlockBadge('firstCutout');
    if (stage >= 3) await unlockBadge('crisp3d');
    if (stage >= 4) await unlockBadge('printer');
    if (status === 'Built') {
      await unlockBadge('masterFolder');
      await incrementBuilt();
    }
  } catch (err) {
    console.warn('Failed to check and unlock badges:', err);
  }
}

export async function getStats(): Promise<UserStats> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return { objectsScanned: 0, craftsBuilt: 0 };
    return JSON.parse(raw);
  } catch {
    return { objectsScanned: 0, craftsBuilt: 0 };
  }
}

export async function incrementScanned(): Promise<void> {
  try {
    const stats = await getStats();
    stats.objectsScanned += 1;
    await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (err) {
    console.warn('Failed to increment scanned:', err);
  }
}

export async function incrementBuilt(): Promise<void> {
  try {
    const stats = await getStats();
    stats.craftsBuilt += 1;
    await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (err) {
    console.warn('Failed to increment built:', err);
  }
}

export async function getPaperPreference(): Promise<'A4' | 'Letter'> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.PAPER_SIZE);
    return val === 'Letter' ? 'Letter' : 'A4';
  } catch {
    return 'A4';
  }
}

export async function setPaperPreference(pref: 'A4' | 'Letter'): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PAPER_SIZE, pref);
  } catch (err) {
    console.warn('Failed to set paper pref:', err);
  }
}
