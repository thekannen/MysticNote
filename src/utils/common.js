import { fileURLToPath } from 'url';
import path from 'path';

// Resolve __dirname in ESM
export function getDirName(importMetaUrl = import.meta.url) {
  const __filename = fileURLToPath(importMetaUrl);
  return path.dirname(__filename);
}

export function generateTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Sanitize names to safe alphanumeric + _-
export function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}