/**
 * mobile/services/api.ts
 * ──────────────────────
 * Client API for Foldly backend integration:
 * - Scanned image upload (multipart/form-data with 'file')
 * - Generous 90s+ job polling with progressive status reporting
 * - Gemini AI polish and cutout sheet triggers
 * - Strict snake_case ↔ camelCase mappers
 * - Safe URL resolvers & Base64 image converter for 300 DPI PDF rendering
 * - 100% offline Demo Mode fallbacks
 */

import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { CreationItem, getOrCreateDeviceId } from './storage';

const DEFAULT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export interface BackendHealth {
  status: string;
  timestamp: string;
}

export interface QualityMetricsDto {
  solidity: number;
  sharpness: number;
  crop_edge_quality: number;
  pixel_coverage?: number;
}

export interface ContourResultDto {
  points: [number, number][];
  perimeter_mm: number;
  edge_color_hex: string;
  smoothness: string;
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
  quality_metrics?: QualityMetricsDto | null;
  contour?: ContourResultDto | null;
  preview_url?: string | null;
  trimmed_url?: string | null;
  polished_url?: string | null;
  sheet_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface JobStatusResponse {
  job_id: string;
  project_id: string;
  stage: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress: number;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
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
      pixelCoverage: 0.62,
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
      pixelCoverage: 0.54,
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
      pixelCoverage: 0.48,
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
      pixelCoverage: 0.58,
    },
  },
];

// ── URL & Mapper Helpers ──────────────────────────────────────────────────────

/**
 * Resolves a relative or absolute URL against API_BASE_URL cleanly without double slashes.
 */
export function resolveApiUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (
    path.startsWith('data:') ||
    path.startsWith('file:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Maps raw backend ProjectResponse (snake_case) to client CreationItem (camelCase)
 */
export function mapProjectToCreationItem(p: ProjectResponse): CreationItem {
  const statusMap: Record<string, 'Ready' | 'Building' | 'Built'> = {
    ready: 'Ready',
    processing: 'Building',
    built: 'Built',
  };

  return {
    id: p.project_id,
    name: p.suggested_name || p.object_name || 'Custom Craft',
    category: p.category || 'Custom',
    status: statusMap[p.status.toLowerCase()] || 'Ready',
    buildStep: 0,
    totalSteps: 7,
    moldStyle: 'block',
    heightCm: p.estimated_height_cm || 18,
    depthCm: 2.5,
    edgeColorHex: p.contour?.edge_color_hex || p.dominant_colors?.[0] || '#F4C430',
    previewUrl: resolveApiUrl(p.preview_url),
    trimmedUrl: resolveApiUrl(p.trimmed_url),
    polishedUrl: resolveApiUrl(p.polished_url),
    sheetUrl: resolveApiUrl(p.sheet_url),
    updatedAt: p.updated_at ? new Date(p.updated_at).getTime() : Date.now(),
    qualityMetrics: p.quality_metrics
      ? {
          solidity: p.quality_metrics.solidity ?? 0.85,
          sharpness: p.quality_metrics.sharpness ?? 90.0,
          cropEdgeQuality: p.quality_metrics.crop_edge_quality ?? 0.95,
          pixelCoverage: p.quality_metrics.pixel_coverage ?? 0.5,
        }
      : undefined,
    contour: p.contour
      ? {
          points: p.contour.points || [],
          perimeterMm: p.contour.perimeter_mm || 0,
          edgeColorHex: p.contour.edge_color_hex || '#888888',
          smoothness: p.contour.smoothness || 'Medium',
        }
      : undefined,
  };
}

// ── Base64 Converter for 300-DPI Native Android PDF Printing ─────────────────

/**
 * Converts a local file URI or remote HTTP image URL into a base64 data URI
 * (e.g. data:image/png;base64,...) so Android print rendering never fails on network/CORS.
 */
export async function fetchImageAsBase64(imageUri: string | null | undefined): Promise<string | null> {
  if (!imageUri) return null;
  if (imageUri.startsWith('data:image/')) return imageUri;

  const deviceId = await getOrCreateDeviceId();
  const resolved = resolveApiUrl(imageUri) || imageUri;

  try {
    // For local file:// or content:// URIs
    if (resolved.startsWith('file:') || resolved.startsWith('content:')) {
      const result = await ImageManipulator.manipulateAsync(resolved, [], {
        base64: true,
        format: ImageManipulator.SaveFormat.PNG,
      });
      if (result.base64) {
        return `data:image/png;base64,${result.base64}`;
      }
    }

    // For remote http/https URIs
    const res = await fetch(resolved, {
      headers: {
        'X-Device-ID': deviceId,
      },
    });

    if (!res.ok) {
      console.warn(`[Base64] Fetch failed for ${resolved} (HTTP ${res.status})`);
      return null;
    }

    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => {
        console.warn('[Base64] FileReader error reading blob');
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[Base64] Error converting image to base64:', err);
    return null;
  }
}

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

/**
 * Uploads camera/gallery photo to FastAPI /api/v1/projects/scan
 * uses form field 'file' and header 'X-Device-ID'
 */
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

/**
 * Polls background scan job status with generous 90s+ timeout
 * (accounts for initial rembg ONNX model download)
 */
export async function pollJobUntilDone(
  jobId: string,
  onProgress?: (progress: number, stageDesc: string) => void,
  maxAttempts: number = 65,
  intervalMs: number = 1500
): Promise<JobStatusResponse> {
  const stageDescriptions: Record<string, string> = {
    uploaded: 'Image received, preparing pipeline...',
    segmentation: 'Neural subject segmentation (downloading AI model on first run)...',
    contour: 'Tracing sub-pixel polygon vector contour...',
    metadata: 'Extracting dimensions and papercraft parameters...',
    done: 'Subject lift complete!',
    failed: 'Segmentation pipeline encountered an error.',
  };

  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    await new Promise((r) => setTimeout(r, intervalMs));

    try {
      const job = await getJobStatus(jobId);
      const desc = stageDescriptions[job.stage] || `Processing stage: ${job.stage}`;

      if (onProgress) {
        onProgress(job.progress, desc);
      }

      if (job.status === 'done') {
        return job;
      }
      if (job.status === 'failed') {
        throw new Error(job.error || 'Backend processing job failed.');
      }
    } catch (err: any) {
      if (attempts >= maxAttempts) {
        throw err;
      }
    }
  }

  throw new Error('Pipeline timed out after 90 seconds. Please try again or use Demo Mode.');
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`);
  if (!res.ok) {
    throw new Error(`Failed to get job status (${res.status})`);
  }
  return res.json();
}

export async function getProjectDetails(projectId: string): Promise<ProjectResponse> {
  const deviceId = await getOrCreateDeviceId();
  const res = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}`, {
    headers: {
      'X-Device-ID': deviceId,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to load project details (${res.status})`);
  }
  return res.json();
}

export async function fetchProjects(limit: number = 20, offset: number = 0): Promise<ProjectResponse[]> {
  const deviceId = await getOrCreateDeviceId();
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/projects?limit=${limit}&offset=${offset}`, {
      headers: {
        'X-Device-ID': deviceId,
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.warn('Backend fetchProjects failed (using offline mode):', err);
    return [];
  }
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
      const data = await res.json();
      return {
        status: data.status,
        polished_url: resolveApiUrl(data.polished_url) || undefined,
      };
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
      const data = await res.json();
      return {
        status: data.status,
        sheet_url: resolveApiUrl(data.sheet_url) || undefined,
      };
    }
  } catch (err) {
    console.warn('Cutout sheet failed, fallback to local:', err);
  }
  return { status: 'generated', sheet_url: undefined };
}
