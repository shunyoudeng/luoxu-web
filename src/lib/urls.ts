import { withBase as resolvePath, stripBase as removeBase, releaseHref as resolveRelease } from './paths.mjs';
import { site } from './site';
export const withBase = (path: string) => resolvePath(path, import.meta.env.BASE_URL);
export const stripBase = (path: string) => removeBase(path, import.meta.env.BASE_URL);
export const releaseHref = (path: string) => resolveRelease(path, import.meta.env.BASE_URL);
export const absoluteUrl = (path: string) => site.siteUrl ? new URL(withBase(path), site.siteUrl + '/').href : '';
