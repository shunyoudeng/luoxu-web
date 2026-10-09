import { readConfig, feedbackHref } from './config.mjs';
export const site = readConfig(import.meta.env);
export { feedbackHref };
export const description = '珞序是一款本地优先的校园 AI 助手，将授权来源的通知整理为任务、作业、机会和校园信息。Android 内测，关注隐私与日常事务管理。';
export const pagePaths = ['/', '/download', '/changelog', '/privacy', '/terms', '/about'];
