import { Platform } from 'react-native';
import { CreationItem, getOrCreateDeviceId } from './storage';

const DEFAULT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

export interface BackendHealth {
  status: string;
  timestamp: string;
}

export interface ProjectResponse {
  project_id: string;
  device_id: string;
  original_filename: string;
  status: string;
  stage: string;
  object_name: string;
  category: string;
  suggested_name: string;
  complexity: string;
  paper_size: string;
  estimated_height_cm: number;
  dominant_colors: string[];
  preview_url?: string | null;
  trimmed_url?: string | null;
  polished_url?: string | null;
  sheet_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobStatusResponse {
  job_id: string;
  project_id: string;
  stage: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress: number;
  error?: string | null;
}

// ── Built-in Demo Samples from PROJECT_SPEC.md §1 ────────────────────────────

export const DEMO_SAMPLES: CreationItem[] = [
  {
    id: 'demo_crossing',
    sampleId: 'crossing',
    name: 'Pedestrian Crossing Sign',
    category: 'Signs',
    status: 'Ready',
    buildStep: 0,
    totalSteps: 7,
    moldStyle: 'block',
    heightCm: 18,
    depthCm: 2.5,
    edgeColorHex: '#F4C430',
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
    qualityMetrics: {
      solidity: 0.88,
      sharpness: 94.2,
      cropEdgeQuality: 0.98,
    },
  },
  {
    id: 'demo_sneaker',
    sampleId: 'sneaker',
    name: 'Retro Sneaker',
    category: 'Style',
    status: 'Building',
    buildStep: 3,
    totalSteps: 7,
    moldStyle: 'block',
    heightCm: 16,
    depthCm: 3.2,
    edgeColorHex: '#E63946',
    updatedAt: Date.now() - 1000 * 60 * 60 * 12,
    qualityMetrics: {
      solidity: 0.76,
      sharpness: 89.5,
      cropEdgeQuality: 0.95,
    },
  },
  {
    id: 'demo_fox',
    sampleId: 'fox',
    name: 'Fox Sticker',
    category: 'Animals',
    status: 'Built',
    buildStep: 7,
    totalSteps: 7,
    moldStyle: 'standee',
    heightCm: 14,
    depthCm: 1.0,
    edgeColorHex: '#F5A623',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
    qualityMetrics: {
      solidity: 0.82,
      sharpness: 91.0,
      cropEdgeQuality: 0.99,
    },
  },
  {
    id: 'demo_boba',
    sampleId: 'boba',
    name: 'Boba Tea Cup',
    category: 'Drinks',
    status: 'Ready',
    buildStep: 0,
    totalSteps: 7,
    moldStyle: 'block',
    heightCm: 15,
    depthCm: 2.8,
    edgeColorHex: '#9DB8AF',
    updatedAt: Date.now() - 1000 * 60 * 60 * 36,
    qualityMetrics: {
      solidity: 0.85,
      sharpness: 88.0,
      cropEdgeQuality: 0.97,
    },
  },
];

// ── API Methods ───────────────────────────────────────────────────────────────

export async function checkBackendHealth(): Promise<{ ok: boolean; statusText: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: BackendHealth = await res.json();
      return { ok: true, statusText: data.status || 'online' };
    }
    return { ok: false, statusText: `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, statusText: err.message || 'offline' };
  }
}

export async function uploadScan(
  fileUri: string,
  mimeType: string = 'image/jpeg',
  filename: string = 'scan.jpg'
): Promise<{ project_id: string; job_id: string; status: string }> {
  const deviceId = await getOrCreateDeviceId();

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: mimeType,
    name: filename,
  } as any);

  const res = await fetch(`${API_BASE_URL}/api/v1/projects/scan`, {
    method: 'POST',
    headers: {
      'X-Device-ID': deviceId,
    },
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Scan upload failed with HTTP ${res.status}`);
  }

  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`);
  if (!res.ok) {
    throw new Error(`Failed to get job status (${res.status})`);
  }
  return res.json();
}

export async function fetchProjects(limit: number = 20, offset: number = 0): Promise<ProjectResponse[]> {
  const deviceId = await getOrCreateDeviceId();
  const res = await fetch(`${API_BASE_URL}/api/v1/projects?limit=${limit}&offset=${offset}`, {
    headers: {
      'X-Device-ID': deviceId,
    },
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.items || [];
}

export async function triggerPolish(
  projectId: string,
  croppedSides: string[] = []
): Promise<{ status: string; polished_url?: string }> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const query = croppedSides.map((s) => `cropped_sides=${encodeURIComponent(s)}`).join('&');
    const url = `${API_BASE_URL}/api/v1/projects/${projectId}/polish${query ? `?${query}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Device-ID': deviceId,
      },
    });
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn('Polish failed, fallback to local:', err);
  }
  return { status: 'polished', polished_url: undefined };
}

export async function triggerCutoutSheet(
  projectId: string
): Promise<{ status: string; sheet_url?: string }> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const res = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/cutout-sheet`, {
      method: 'POST',
      headers: {
        'X-Device-ID': deviceId,
      },
    });
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn('Cutout sheet failed, fallback to local:', err);
  }
  return { status: 'generated', sheet_url: undefined };
}
