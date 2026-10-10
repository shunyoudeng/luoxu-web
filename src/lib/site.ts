import { readConfig, feedbackHref } from './config.mjs';
import { official } from './official.mjs';
export const site = readConfig({...import.meta.env,
  PUBLIC_GITHUB_URL: import.meta.env.PUBLIC_GITHUB_URL || official.github,
  PUBLIC_GITHUB_RELEASES_URL: import.meta.env.PUBLIC_GITHUB_RELEASES_URL || official.releases,
  PUBLIC_FEEDBACK_EMAIL: import.meta.env.PUBLIC_FEEDBACK_EMAIL || official.feedbackEmail});
export { feedbackHref };
export const description = '珞序是一款本地优先的校园 AI 助手，将授权来源的通知整理为任务、作业、机会和校园信息。Android 公测，关注隐私与日常事务管理。';
export const pagePaths = ['/', '/download', '/changelog', '/privacy', '/terms', '/about'];
