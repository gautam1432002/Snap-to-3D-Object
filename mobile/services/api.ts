/**
 * mobile/services/api.ts
 * ──────────────────────
 * Client API for Foldly FastAPI backend:
 * - JSON base64 upload (`POST /api/v1/projects/scan-base64`) avoiding Android FormDataPart crashes
 * - Runtime-configurable server URL persisted in AsyncStorage
 * - Strict ContourPoint ({x, y}) normalization & full-res /assets base64 delivery
 */

import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  CreationItem,
  getApiUrlOverride,
  getOrCreateDeviceId,
  setApiUrlOverride,
} from './storage';
import { ContourPoint, SAMPLE_TEMPLATES } from '../utils/sampleTemplates';

const DEFAULT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const ENV_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL).replace(/\/+$/, '');
let cachedApiBaseUrl = ENV_BASE_URL;

export function getEnvDefaultApiUrl(): string {
  return ENV_BASE_URL;
}

export async function getActiveApiBaseUrl(): Promise<string> {
  const override = await getApiUrlOverride();
  cachedApiBaseUrl = override || ENV_BASE_URL;
  return cachedApiBaseUrl;
}

export async function saveActiveApiBaseUrl(url: string | null): Promise<string> {
  await setApiUrlOverride(url);
  return getActiveApiBaseUrl();
}

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
  points: Array<ContourPoint | [number, number]>;
  perimeter_mm: number;
  edge_color_hex: string;
  smoothness: string;
}

export interface ProjectAssetsResponse {
  project_id: string;
  status: string;
  object_name: string;
  suggested_name: string;
  category: string;
  complexity: string;
  paper_size: string;
  estimated_height_cm: number;
  dominant_colors: string[];
  quality_metrics?: QualityMetricsDto | null;
  contour?: ContourResultDto | null;
  perimeter_mm: number;
  edge_color: string;
  engine_used?: string | null;
  ai_source?: string | null;
  ai_warning?: string | null;
  preview_base64?: string | null;
  trimmed_base64?: string | null;
  polished_base64?: string | null;
  sheet_base64?: string | null;
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

export function normalizeContourPoints(
  points: Array<ContourPoint | [number, number]> | undefined | null
): ContourPoint[] {
  if (!Array.isArray(points)) return [];
  return points
    .map((pt) => {
      if (Array.isArray(pt) && pt.length >= 2) {
        return { x: Number(pt[0]) || 0, y: Number(pt[1]) || 0 };
      }
      const obj = pt as ContourPoint;
      return { x: Number(obj?.x) || 0, y: Number(obj?.y) || 0 };
    })
    .filter((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y));
}

export const DEMO_SAMPLES: CreationItem[] = Object.values(SAMPLE_TEMPLATES).map((s) => ({
  id: `demo_${s.id}`,
  sampleId: s.id,
  name: s.name,
  category: s.category,
  status: 'Ready',
  buildStep: 0,
  totalSteps: 5,
  heightCm: s.heightCm,
  depthCm: s.depthCm,
  includeStand: s.suggestStand,
  edgeColorHex: s.edgeColorHex,
  difficulty: s.difficulty,
  estMinutes: s.estMinutes,
  buildTip: s.buildTip,
  updatedAt: Date.now(),
  contour: {
    points: s.contour,
    perimeterMm: 520,
    edgeColorHex: s.edgeColorHex,
    smoothness: 'Medium',
  },
}));

export function resolveApiUrl(
  path: string | null | undefined,
  baseOverride?: string
): string | null {
  if (!path) return null;
  if (
    path.startsWith('data:') ||
    path.startsWith('file:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }
  const base = (baseOverride || cachedApiBaseUrl).replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export async function fetchImageAsBase64(
  imageUri: string | null | undefined
): Promise<string | null> {
  if (!imageUri) return null;
  if (imageUri.startsWith('data:image/')) return imageUri;

  const baseUrl = await getActiveApiBaseUrl();
  const deviceId = await getOrCreateDeviceId();
  const resolved = resolveApiUrl(imageUri, baseUrl) || imageUri;

  try {
    if (resolved.startsWith('file:') || resolved.startsWith('content:')) {
      const result = await ImageManipulator.manipulateAsync(resolved, [], {
        base64: true,
        format: ImageManipulator.SaveFormat.PNG,
      });
      if (result.base64) {
        return `data:image/png;base64,${result.base64}`;
      }
    }

    const res = await fetch(resolved, {
      headers: { 'X-Device-ID': deviceId },
    });
    if (!res.ok) return null;

    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[Base64] Conversion failed:', err);
    return null;
  }
}

export async function checkBackendHealth(
  customUrl?: string
): Promise<{ ok: boolean; statusText: string; url: string }> {
  const targetUrl = customUrl
    ? customUrl.trim().replace(/\/+$/, '')
    : await getActiveApiBaseUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${targetUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: BackendHealth = await res.json();
      return { ok: true, statusText: data.status || 'online', url: targetUrl };
    }
    return { ok: false, statusText: `HTTP ${res.status}`, url: targetUrl };
  } catch (err: any) {
    return {
      ok: false,
      statusText: err?.name === 'AbortError' ? 'Timed out (3s)' : err?.message || 'Unreachable',
      url: targetUrl,
    };
  }
}

/**
 * JSON base64 scan upload (`POST /api/v1/projects/scan-base64`) avoiding Android FormDataPart bugs.
 */
export async function uploadScanBase64(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  filename: string = 'scan.jpg'
): Promise<{ project_id: string; job_id: string; status: string }> {
  const baseUrl = await getActiveApiBaseUrl();
  const deviceId = await getOrCreateDeviceId();
  const target = `${baseUrl}/api/v1/projects/scan-base64`;

  let res: Response;
  try {
    res = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': deviceId,
      },
      body: JSON.stringify({
        image_base64: imageBase64,
        mime_type: mimeType,
        filename,
      }),
    });
  } catch (networkErr: any) {
    throw new Error(
      `Cannot reach ${baseUrl} — ensure FastAPI is running on port 8000 and allowed in Windows Firewall. (${networkErr?.message || 'Network request failed'})`
    );
  }

  const rawBody = await res.text();
  if (!res.ok) {
    let detail = rawBody;
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed.detail) detail = parsed.detail;
    } catch {}
    throw new Error(`Server ${baseUrl} returned HTTP ${res.status}: ${detail}`);
  }

  return JSON.parse(rawBody);
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const baseUrl = await getActiveApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/jobs/${jobId}`);
  if (!res.ok) {
    throw new Error(`Failed to get job status (HTTP ${res.status})`);
  }
  return res.json();
}

export async function pollJobUntilDone(
  jobId: string,
  onProgress?: (progress: number, stageDesc: string) => void,
  maxAttempts: number = 65,
  intervalMs: number = 1400
): Promise<JobStatusResponse> {
  const stageDescriptions: Record<string, string> = {
    uploaded: 'Photo received, queuing AI pipeline...',
    segmentation: 'Lifting crisp subject cutout...',
    contour: 'Tracing sharp vector outline...',
    metadata: 'Identifying object with Gemini...',
    done: 'Subject cutout ready!',
    failed: 'Segmentation pipeline failed.',
  };

  let attempts = 0;
  let lastErr: Error | null = null;

  while (attempts < maxAttempts) {
    attempts++;
    await new Promise((r) => setTimeout(r, intervalMs));

    try {
      const job = await getJobStatus(jobId);
      const desc = stageDescriptions[job.stage] || `Processing: ${job.stage}`;
      onProgress?.(job.progress, desc);

      if (job.status === 'done') return job;
      if (job.status === 'failed') {
        throw new Error(job.error || 'Backend processing job failed.');
      }
    } catch (err: any) {
      lastErr = err;
      if (err?.message?.includes('Backend processing job failed')) {
        throw err;
      }
      if (attempts >= maxAttempts) {
        throw lastErr || new Error('Job polling timed out.');
      }
    }
  }

  throw new Error('Scan timed out after 90 seconds. Check server logs and retry.');
}

export async function getProjectAssets(
  projectId: string,
  options?: { smoothness?: 'Easy' | 'Medium' | 'Hard'; heightCm?: number }
): Promise<ProjectAssetsResponse> {
  const baseUrl = await getActiveApiBaseUrl();
  const deviceId = await getOrCreateDeviceId();

  const params: string[] = [];
  if (options?.smoothness) params.push(`smoothness=${encodeURIComponent(options.smoothness)}`);
  if (options?.heightCm) params.push(`height_cm=${encodeURIComponent(String(options.heightCm))}`);
  const qs = params.length ? `?${params.join('&')}` : '';

  const res = await fetch(`${baseUrl}/api/v1/projects/${projectId}/assets${qs}`, {
    headers: { 'X-Device-ID': deviceId },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to load project assets (HTTP ${res.status}): ${body}`);
  }
  return res.json();
}

export async function triggerPolish(
  projectId: string,
  croppedSides: string[] = []
): Promise<{
  status: string;
  polished_url?: string;
  polished_base64?: string;
  contour?: ContourResultDto | null;
  ai_source?: string;
  ai_warning?: string | null;
}> {
  const baseUrl = await getActiveApiBaseUrl();
  const deviceId = await getOrCreateDeviceId();
  const query = croppedSides.map((s) => `cropped_sides=${encodeURIComponent(s)}`).join('&');
  const url = `${baseUrl}/api/v1/projects/${projectId}/polish${query ? `?${query}` : ''}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-Device-ID': deviceId },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Polish failed (HTTP ${res.status}): ${msg}`);
  }
  const data = await res.json();
  return {
    ...data,
    polished_url: resolveApiUrl(data.polished_url, baseUrl) || undefined,
  };
}

export async function triggerCutoutSheet(
  projectId: string
): Promise<{
  status: string;
  sheet_url?: string;
  sheet_base64?: string;
  ai_source?: string;
  ai_warning?: string | null;
}> {
  const baseUrl = await getActiveApiBaseUrl();
  const deviceId = await getOrCreateDeviceId();
  const res = await fetch(`${baseUrl}/api/v1/projects/${projectId}/cutout-sheet`, {
    method: 'POST',
    headers: { 'X-Device-ID': deviceId },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Cutout sheet failed (HTTP ${res.status}): ${msg}`);
  }
  const data = await res.json();
  return {
    ...data,
    sheet_url: resolveApiUrl(data.sheet_url, baseUrl) || undefined,
  };
}
