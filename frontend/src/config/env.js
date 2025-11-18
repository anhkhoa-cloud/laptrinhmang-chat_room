const normalizeBaseUrl = (url) => {
  if (!url) {
    return '';
  }
  return url.replace(/\/+$/, '');
};
const dynamicHost = window.location.hostname;
const rawApiBaseUrl = process.env.REACT_APP_API_BASE_URL || `http://${dynamicHost}:8080`;

export const API_BASE_URL = normalizeBaseUrl(rawApiBaseUrl);
export const SOCKJS_ENDPOINT = `${API_BASE_URL}/ws`;

export const toAbsoluteUrl = (path = '') => {
  if (!path) {
    return '';
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};



