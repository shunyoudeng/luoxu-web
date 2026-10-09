# 架构与技术设计

[返回文档目录](README.md)

## 仓库范围

`luoxu-web` 是珞序 Android 应用的独立产品网站，提供产品介绍、下载、更新记录和使用说明。它不执行通知监听、消息分析或用户事务管理；这些能力由应用实现。

Astro 在构建时生成 HTML、CSS 和少量浏览器脚本。配置为 `output: static`，没有 SSR 适配器、数据库或生产 Node 服务。功能示意的切换使用轻量浏览器交互；导航与正文可以在 JavaScript 不可用时阅读。

## 目录职责

| 目录 | 职责 |
| --- | --- |
| [src/pages](../src/pages) | 页面和构建期静态 JSON/XML/TXT 端点 |
| [src/layouts](../src/layouts) | 共用导航、页脚和 SEO |
| [src/components](../src/components)、[src/sections](../src/sections) | 复用组件和首页章节 |
| [src/styles](../src/styles) | 品牌 token、布局与响应式 |
| [src/lib](../src/lib) | 公开配置、链接和版本数据解析 |
| [src/data](../src/data) | 更新日志内容 |
| [public](../public) | 原样复制的静态资源与 App 元数据 |
| [scripts](../scripts) | 构建入口、APK校验和素材维护 |
| [tests](../tests) | 单元、静态构建和浏览器测试 |

## 数据来源

网站版本在 [package.json](../package.json) 中；App 版本来自 [public/releases/latest.json](../public/releases/latest.json)。更新内容由 [src/data/history.json](../src/data/history.json) 管理。页面和静态版本接口共享这些来源。

`robots.txt`、`sitemap.xml` 和 `releases/history.json` 在构建阶段写为静态文件。源码中的 `APIRoute` 与 `Response` 并不意味着线上需要运行 API 服务。

## 配置与路径

公开配置由 [config.mjs](../src/lib/config.mjs) 和 [site.ts](../src/lib/site.ts) 读取。[astro.config.mjs](../astro.config.mjs) 从相同环境取得 site/base。内部链接由 paths.mjs、urls.ts 处理，兼容域名根路径和项目子路径。

环境变量会在构建时固定到产物。改变域名、反馈邮箱或备案信息之后需要重新构建和部署。

## 隐私边界

网站不接收 API Key、聊天记录、事务或 AI 对话，没有账号、分析统计或广告追踪。GitHub Pages 托管服务的基础访问日志与网站自身的数据采集不同，相关说明在[隐私页](https://shunyoudeng.github.io/luoxu-web/privacy/)。

App 的本地存储与模型请求属于独立应用的数据流程，不应描述成“所有数据都不离开设备”。展示产品能力时区分应用功能与官网功能。

## 设计与选择

暖白、灰绿、细线、开放排版与少量山形线稿构成官网视觉语言，具体见[设计规范](../DESIGN.md)。技术选择依据见[技术选型文档](GitHub-First.md)。
