import type { Medicine } from '../data/medicineDb';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_STORAGE_KEY = 'medai_token';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  theme?: string;
  language?: string;
  role?: UserRole;
  token?: string;
}

export interface ApiHealth {
  status: string;
  message: string;
  dataSource: string;
  authMode: string;
}

export interface MedicineSearchResponse {
  medicines: Medicine[];
  total?: number;
  page?: number;
  pages?: number;
  source?: string;
}

export interface MedicineHistoryItem extends Medicine {
  searchedAt?: string;
}

export interface PrescriptionScanItem {
  branded: string;
  generic: string;
  composition: string;
  usage: string;
  brandedPrice: number;
  genericPrice: number;
  category: string;
  warning?: string;
}

export interface DrugInteractionResult {
  safe: boolean;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  title: string;
  description: string;
  recommendation: string;
  symptoms: string[];
}

export interface PharmacyStore {
  id: string;
  name: string;
  address: string;
  city?: string;
  distanceKm?: number;
  phone?: string;
  website?: string;
  categories?: string;
  mapUrl?: string;
  tomtomUrl?: string;
  position?: {
    lat: number;
    lon: number;
  };
}

export interface NearbyPharmacyResponse {
  stores: PharmacyStore[];
  source: string;
}

interface RawMedicine {
  id: string | number;
  branded?: string;
  brandedName?: string;
  generic?: string;
  genericName?: string;
  composition?: string;
  usage?: string;
  description?: string;
  category?: string;
  brandedPrice?: number;
  genericPrice?: number;
}

interface MedicinesResponse {
  medicines?: RawMedicine[];
  total?: number;
  page?: number;
  pages?: number;
  source?: string;
}

interface RawMedicineHistoryItem extends RawMedicine {
  medicineId?: string | number;
  branded?: string;
  generic?: string;
  searchedAt?: string;
}

interface SearchHistoryResponse {
  history?: RawMedicineHistoryItem[];
}

interface ApiErrorPayload {
  message?: string;
  error?: string | { message?: string };
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function getErrorMessage(payload: ApiErrorPayload | string | null, fallback: string) {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  if (payload.error?.message) {
    return payload.error.message;
  }

  if (payload.message) {
    return payload.message;
  }

  return fallback;
}

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload as ApiErrorPayload | string | null, `Request failed with status ${response.status}`));
  }

  return payload as T;
}

function normalizeMedicine(medicine: RawMedicine): Medicine {
  const brandedName = medicine.brandedName || medicine.branded || 'Unknown brand';
  const genericName = medicine.genericName || medicine.generic || 'Unknown generic';
  const composition = medicine.composition || 'Composition unavailable';
  const description =
    medicine.description ||
    medicine.usage ||
    `${genericName} is commonly used in routine treatment.`;

  return {
    id: String(medicine.id),
    brandedName,
    genericName,
    composition,
    brandedPrice: Number(medicine.brandedPrice || 0),
    genericPrice: Number(medicine.genericPrice || 0),
    description,
    category: medicine.category || 'General',
  };
}

function normalizeMedicineHistoryItem(item: RawMedicineHistoryItem): MedicineHistoryItem {
  const normalizedMedicine = normalizeMedicine({
    ...item,
    id: item.medicineId ?? item.id ?? '',
  });

  return {
    ...normalizedMedicine,
    searchedAt: item.searchedAt,
  };
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
}

function parseJsonString<T>(value: string, fallback: T) {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    return fallback;
  }
}

function extractChatContent(response: ChatCompletionResponse) {
  const content = response?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : '';
}

function parseStructuredAiResult<T>(payload: any, fallback: T): T {
  if (payload?.result) {
    return payload.result as T;
  }

  const content = extractChatContent(payload);
  if (content) {
    return parseJsonString<T>(content, fallback);
  }

  return fallback;
}

export function normalizeAuthUser(user: AuthUser) {
  return {
    id: user._id,
    displayName: user.name,
    name: user.name,
    email: user.email,
    avatar: user.avatar || '',
    theme: user.theme || 'medical',
    language: user.language || 'en',
    role: user.role || 'user',
    token: user.token || '',
  };
}

export async function signUp(name: string, email: string, password: string) {
  return request<AuthUser>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function signIn(email: string, password: string) {
  return request<AuthUser>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function demoLogin(role: UserRole) {
  return request<AuthUser>('/api/auth/demo', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
}

export async function getCurrentUser(token: string) {
  return request<AuthUser>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updatePreferences(
  token: string,
  preferences: { theme?: string; language?: string }
) {
  return request<AuthUser>('/api/auth/preferences', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(preferences),
  });
}

export async function getMedicineSearchHistory(token: string) {
  const response = await request<SearchHistoryResponse>('/api/auth/search-history', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return (response.history || []).map(normalizeMedicineHistoryItem);
}

export async function saveMedicineSearchHistory(token: string, medicine: Medicine) {
  const response = await request<SearchHistoryResponse>('/api/auth/search-history', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ medicine }),
  });

  return (response.history || []).map(normalizeMedicineHistoryItem);
}

export async function clearMedicineSearchHistory(token: string) {
  const response = await request<SearchHistoryResponse>('/api/auth/search-history', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return (response.history || []).map(normalizeMedicineHistoryItem);
}

export async function searchMedicines(query: string, page = 1, limit = 20): Promise<MedicineSearchResponse> {
  const params = new URLSearchParams({
    search: query,
    page: String(page),
    limit: String(limit),
  });
  const response = await request<MedicinesResponse>(`/api/medicines?${params.toString()}`);

  return {
    ...response,
    medicines: (response.medicines || []).map(normalizeMedicine),
  };
}

export async function getMedicineById(id: string | number) {
  const response = await request<RawMedicine>(`/api/medicines/${id}`);
  return normalizeMedicine(response);
}

export async function aiChat(
  messages: { role: string; content: string }[],
  options?: { model?: string; maxTokens?: number }
) {
  const response = await request<ChatCompletionResponse>('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages,
      model: options?.model || 'gpt-4o-mini',
      max_tokens: options?.maxTokens || 400,
    }),
  });

  const content = extractChatContent(response);
  if (content) {
    return content;
  }

  throw new Error('The AI service returned an unexpected response.');
}

export async function scanPrescription(imageBase64?: string, text?: string) {
  const messages = imageBase64
    ? [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
            {
              type: 'text',
              text: 'Extract all medicines from this prescription.',
            },
          ],
        },
      ]
    : [
        {
          role: 'user',
          content: `Extract all medicines from: ${text || ''}`,
        },
      ];

  const response = await request<any>('/api/ai/scan', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });

  return parseStructuredAiResult<PrescriptionScanItem[]>(response, []);
}

export async function checkInteraction(medicines: string[]) {
  const response = await request<any>('/api/ai/interaction', {
    method: 'POST',
    body: JSON.stringify({ medicines }),
  });

  return parseStructuredAiResult<DrugInteractionResult>(response, {
    safe: false,
    severity: 'moderate',
    title: 'Interaction check unavailable',
    description: 'The interaction service did not return a usable result.',
    recommendation: 'Check this combination with a pharmacist.',
    symptoms: [],
  });
}

export async function getSymptomSuggestions(symptoms: string) {
  const response = await request<any>('/api/ai/symptoms', {
    method: 'POST',
    body: JSON.stringify({ symptoms }),
  });

  return parseStructuredAiResult<PrescriptionScanItem[]>(response, []);
}

export async function getApiHealth() {
  return request<ApiHealth>('/api/health');
}

export async function getNearbyPharmacies(
  lat: number,
  lon: number,
  limit = 8,
  query = 'pharmacy'
) {
  const response = await getNearbyPharmaciesDetailed(lat, lon, {
    limit,
    query,
  });

  return response.stores;
}

export async function getNearbyPharmaciesDetailed(
  lat: number,
  lon: number,
  options?: {
    limit?: number;
    query?: string;
    radiusMeters?: number;
  }
): Promise<NearbyPharmacyResponse> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    limit: String(options?.limit ?? 8),
    query: options?.query || 'pharmacy',
  });

  if (options?.radiusMeters) {
    params.set('radius', String(options.radiusMeters));
  }

  const response = await request<{ stores?: PharmacyStore[]; source?: string }>(
    `/api/pharmacies/nearby?${params.toString()}`
  );
  return {
    stores: response.stores || [],
    source: response.source || 'unknown',
  };
}

export function getAuthToken() {
  return getStoredToken();
}
