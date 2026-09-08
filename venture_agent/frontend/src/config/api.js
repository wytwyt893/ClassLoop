const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').trim();

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

export function buildApiUrl(path = '') {
  if (!path) return API_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function buildAssetUrl(path = '') {
  return buildApiUrl(path);
}
