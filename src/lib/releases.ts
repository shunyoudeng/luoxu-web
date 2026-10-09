import json from '../../public/releases/latest.json';
import { validateRelease, formatBytes, formatDate } from './release.mjs';
export const latest = validateRelease(json);
export { formatBytes, formatDate };
