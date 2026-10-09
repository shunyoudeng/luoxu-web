# 珞序 LUOXU

让消息各归其位，让校园生活自成秩序。

珞序是一款面向大学生日常生活的校园 AI 助手，将授权来源的通知整理为任务、作业、机会和校园信息。本仓库是其官方产品网站源码，Android 应用独立维护。

App 当前公测版本为 **0.6.3 / Public Beta**。官网与 App 分别维护版本，下载信息以官网发布的版本元数据为准。

**[Website / 官方网站](https://shunyoudeng.github.io/luoxu-web/)** · **[GitHub / Android 源码](https://github.com/shunyoudeng/luoxu-android)** · **[Latest Release / 安装包](https://github.com/shunyoudeng/luoxu-android/releases/tag/v0.6.3)**

[下载说明](https://shunyoudeng.github.io/luoxu-web/download/) · [更新日志](https://shunyoudeng.github.io/luoxu-web/changelog/) · [反馈邮箱](mailto:luoxufeedback@163.com) · [开发者 Issue](https://github.com/shunyoudeng/luoxu-android/issues) · [官网源码](https://github.com/shunyoudeng/luoxu-web)


## 三个官方入口

App 是日常使用的 Android 客户端；Website 提供产品介绍、下载、隐私与版本信息；GitHub 用于源码、Issue、PR 和版本发布。普通用户先看官网并安装 App，开发者从 GitHub 了解实现。本仓库只维护官网，Android 与可选开发后端由独立项目维护。

你的校园生活，不应该成为任何人的数据库。

Open source. Local-first. Officially maintained.

## 项目介绍

官网提供产品介绍、Android 安装包下载、更新日志、隐私说明和使用指南。它是一个静态网站，不提供账号系统，也不接收用户的聊天记录、事务或模型 API Key。首页的产品界面为标注过的功能示意。

技术栈为 **Astro 7.3.8 + TypeScript**，配合原生 CSS 和少量浏览器交互。生产构建输出到 `dist/`，通过 GitHub Pages 发布，无需运行 Node.js 后台。

## 本地运行

推荐 Node.js 24，最低版本 22.12.0。

```sh
git clone https://github.com/shunyoudeng/luoxu-web.git
cd luoxu-web
npm ci
npm run dev
```

打开 <http://127.0.0.1:4321>。预览生产构建：

```sh
npm run build
npm run preview
```

## 项目结构与文档

```text
src/        页面、组件、样式与版本展示逻辑
public/     图片、图标、APK 与 App 版本元数据
tests/      配置、静态构建与浏览器测试
docs/       开发、部署、版本维护与架构指南
```

- [本地开发](docs/development.md)
- [GitHub Pages 部署](docs/GitHub-Pages.md)：推送 `main` 后自动构建与部署，也支持手动触发。
- [APK 与更新日志维护](docs/releases.md)
- [完整文档目录](docs/README.md) · [设计规范](DESIGN.md)

## 贡献与反馈

普通反馈请联系 [luoxufeedback@163.com](mailto:luoxufeedback@163.com)。网站代码问题和改进建议可以提交到 [GitHub Issues](https://github.com/shunyoudeng/luoxu-web/issues)。参与开发请阅读[贡献指南](CONTRIBUTING.md)和[安全规范](docs/security.md)。

## 许可证

Android 与官网源码均采用 Apache-2.0 主许可证；本仓库的[完整许可证](LICENSE)、[NOTICE](NOTICE)仅覆盖官网自身代码与文档。第三方组件保留各自许可证，详见[第三方声明](THIRD_PARTY_NOTICES.md)。Android 的依赖与发行签名边界见其独立仓库。

## Deployment

官网使用 GitHub Pages、GitHub Actions 与 Astro 静态构建。推送到 `main` 后自动校验、构建与发布，也可手动触发。工作流、自定义域名和迁移方法见[部署指南](docs/GitHub-Pages.md)。

App 的版本与下载地址由 `public/releases/latest.json` 管理，官网版本由 `package.json` 管理。安装包的维护与 GitHub Releases 用法见[版本指南](docs/releases.md)。
