# GitHub Pages 上线准备

本轮只完成本地配置，未创建远程仓库、登录/授权 GitHub、提交、推送或部署。网站仍为 Astro 静态输出，无 Node 常驻服务。当前独立 Git 仓库位于 main 分支，没有远程。

## 部署工作流

`.github/workflows/deploy.yml` 使用当前官方指南中的 checkout@v7、withastro/action@v6、deploy-pages@v5，另用 configure-pages@v5 获取实际站点 origin / base_path。已检查官方 action.yml：Astro Action 安装依赖、运行 build-cmd 并上传 Pages artifact；deploy job 在 build 成功后部署。

main push 和 workflow_dispatch 均可触发。Node 24；build-cmd 顺序为 check → test → build；工作流使用 contents:read、pages:write、id-token:write 与 github-pages environment，不需要维护者提供 API Key 或个人 token。

origin、子路径和公开仓库链接由真实 GitHub 上下文及 Pages 元数据获得，未硬编码用户名。需要手动覆盖时，仅修改 Actions Variables 的 PUBLIC_SITE_URL / PUBLIC_BASE_PATH，或者本机 .env.local。PUBLIC_SITE_URL 是 HTTPS origin，PUBLIC_BASE_PATH 是 /仓库名 或 /。

## 路径与公开配置

- 页面、图片、图标、SEO 共用 src/lib/paths.mjs、urls.ts；Astro 自动给 CSS/浏览器资源加 base。
- manifest 的 ./ 路径相对 manifest 文件解析。
- latest.json 的 ../downloads、../changelog 相对元数据文件解析；首页和下载页通过同一 URL 解析工具使用它。第三方消费者使用 new URL(value, metadataUrl)。原有根路径数据在 UI/本地维护脚本中仍兼容。
- APK 内容、签名、大小、SHA256 均未改变；版本还是 0.6.0 / build 19 内测候选，不改写成正式发布。
- Pages 构建自动设 PUBLIC_HOSTING_PROVIDER=github-pages，隐私页说明 GitHub 为安全目的保存访问 IP，不再在公开站点误称尚未部署。
- 自定义域名以后可切换 origin 并将 base 改为 /；现在没有 CNAME。

## 本轮实际验收

1. npm run check：37 个文件，0 error / warning / hint。
2. npm test：9 项通过，包括根域名构建、路径兼容与隔离的 Pages 项目静态构建。
3. npm run build：成功，dist 含 7 个 HTML 页面及全部静态资源。
4. 原有 Playwright：11 项通过，六种屏幕宽度与键盘/无障碍检查通过。
5. /luoxu-web 子路径：六页在 390 / 1440 宽度实际浏览器加载均 HTTP 200；手机导航、tab 交互、manifest 图标、APK、canonical/OG/sitemap 通过。无根路径误跳、资源 404 或浏览器运行错误。模拟产物只在忽略的 test-results/pages-dist 中，没有成为默认生产配置。
6. APK 完整下载的长度与 SHA256 校验通过。package-lock.json 未改变。
7. 工作流 YAML 解析通过；尚未在 GitHub runner 上运行，首次远程执行须复核 Actions 结果。
8. 本机 Git 待公开文件与 APK 内解压的文本/Dex/资源模式扫描未发现已识别的模型 Key、GitHub Token、私钥内容、签名 keystore 或微信私有 ID。扫描不是所有编码/隐私信息不存在的绝对证明；发布前仍应核对新增文件。

两个构建测试会使用 Astro 同一临时目录，因此测试采用 --test-concurrency=1，避免并发构建互相覆盖。这不改变页面功能。

## 文件变更

新增：

- .github/workflows/deploy.yml
- src/lib/paths.mjs、src/lib/urls.ts
- tests/paths.test.mjs、tests/pages-build.test.mjs
- 本说明

修改：

- astro.config.mjs、.env.example、.gitignore、package.json
- README.md、AGENTS.md、Start-Preview.ps1、docs/GitHub-First.md
- src/lib/config.mjs、src/lib/release.mjs
- scripts/check-release.mjs、scripts/update-apk.mjs
- public/manifest.webmanifest、public/releases/latest.json
- src/layouts/SiteLayout.astro
- src/components/Brand.astro、ReleasePanel.astro
- src/sections/HomeIntro.astro、ProductStory.astro、PrivacyStory.astro
- src/pages/index.astro、404.astro、changelog.astro、terms.astro、privacy.astro、robots.txt.ts、sitemap.xml.ts
- tests/contracts.test.mjs、configured-build.test.mjs、e2e/site.spec.ts

另生成/更新本机测试产物、截图及记录，这些文件在 .gitignore 中排除，不提交公开仓库。AGENTS/预览脚本中的机器专属用户名改为通用环境路径。没有修改 Android 项目、APK 内容或 UI 样式。

## 维护者下一步

1. 本人创建公开 GitHub 仓库，建议名称 luoxu-web。提供两个真实信息：**GitHub 用户名（或组织名）**、**仓库名**。
2. 使用 Git 客户端推送当前独立项目到 main。APK 61.9 MiB 超过网页上传 25 MiB 限制、低于 Git 100 MiB 限制；不要仅用网页拖拽，也不要上传 node_modules / dist / .env.local。
3. Settings → Pages → Source 选择 GitHub Actions。如首次 push 时 Pages 尚未开启，完成设置后在 Actions 手动 Run workflow。
4. 等工作流成功后，检查 GitHub 提供的真实网址及下载。这一步之前不能宣称已经部署。

如以后发布 APK 到 Releases，改 latest.json 为真实 HTTPS 下载地址即可；本轮没有创建空的假 Release。

## 官方依据

- [Astro Pages 部署指南](https://docs.astro.build/en/guides/deploy/github/)
- [Astro Action 实际源码](https://github.com/withastro/action/blob/v6/action.yml)
- [Configure Pages 输出定义](https://github.com/actions/configure-pages/blob/v5/action.yml)
- [GitHub 自定义 Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Pages 的基础访问日志](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection)
- [GitHub 文件大小限制](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
