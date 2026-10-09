# 阶段记录：首次开发与 Pages 上线准备

记录日期：2026-10-09。以下为历史原文，不作为当前操作指南；其中部署和许可证状态已发生变化。现行文档见[项目首页](../../README.md)和[文档目录](../README.md)。

---

# 珞序 LUOXU 官方产品网站

Luoxu Web v0.1.0。独立静态网站，与Android项目平级维护；不代表武汉大学官方产品。

## 快速运行

需要Node >=22.12.0，推荐Node24与npm。项目内安装：

```sh
npm ci
npm run dev
```

浏览器打开 `http://127.0.0.1:4321`。构建与产物预览：

```sh
npm run check
npm test
npm run build
npm run preview
```

Windows本机npm未在PATH时，可执行 `powershell -File .\Start-Preview.ps1`，使用本机已有Context-Extensions工具链，不修改全局PATH。

## 页面和目录

`/` 产品首页；`/download` 下载及安装；`/changelog` 更新日志；`/privacy` 隐私；`/terms` 使用说明；`/about` 品牌与反馈；`404.html` 未找到页面。

- `src/layouts`：共用SEO、导航、页脚。
- `src/components`：品牌、下载、反馈与功能示意。
- `src/sections`：首页品牌叙述。
- `src/styles`：品牌tokens与响应式样式。
- `src/data/history.json`：更新内容。
- `public/releases/latest.json`：App版本元数据唯一来源。
- `public/downloads`：本地APK。部署前可改为真实外链。
- `public/images/app`：后续脱敏的正式截图；当前不提供假截图。
- `docs`：源码调查、验收与真实浏览器截图。

Astro静态输出，无React、登录、数据库、遥测、追踪或API Key收集。系统字体无外部网络依赖。Astro开发工具的telemetry由项目脚本关闭。

## 公开配置

复制 `.env.example` 为 `.env.local`，填写已经确定的内容，修改后重新Build：

| Variable | 用途 |
| --- | --- |
| PUBLIC_SITE_URL | 真实HTTPS域名，生成canonical/OG/sitemap；未设置时noindex，robots禁止抓取 |
| PUBLIC_BASE_PATH | 根路径用 `/`；项目站点用 `/仓库名`；GitHub Actions 自动从 Pages 配置读取 |
| PUBLIC_HOSTING_PROVIDER | Pages 工作流设为 `github-pages`，隐私页同步说明 GitHub 的基础访问日志；本地未知留空 |
| PUBLIC_GITHUB_URL | 真实项目GitHub地址；未设置时明确“入口准备中” |
| PUBLIC_GITHUB_RELEASES_URL | 可单独填写Releases；否则从已配置的仓库推导 |
| PUBLIC_FEEDBACK_EMAIL | 反馈邮箱、mailto Bug/建议；未配置则展示未开放 |
| PUBLIC_ICP_NUMBER | 真实ICP备案号，页脚链接官方查询 |
| PUBLIC_POLICE_RECORD | 真实公安备案号 |
| PUBLIC_POLICE_RECORD_URL | 对应真实备案详情HTTPS链接 |

这些是公开配置，不要放模型Key或任何Secret。域名没有确定，不生成假域名或假备案。未公布仓库及最终License，不宣称已经开源。

## 更新App版本和APK

网站版本在package.json，App版本仅在public/releases/latest.json。当前为 **0.6.0 / build 19 / Internal Beta候选**，电脑端已测试、真机待验收。APK61.9MB，核对包名com.campusai.app与minSdk26。

更新本地APK：

```sh
npm run release:apk -- --file "绝对路径/new.apk" --version 0.6.1 --build 20 --date 2026-10-10
```

上面的版本/日期只是命令格式示例，请填写真实APK信息。脚本复制到public/downloads、计算大小和SHA256；它不修改APK内容、签名或Android源码。务必自行核对Manifest版本；本次实际APK已经aapt核对。

在latest.json中维护status（candidate/beta/stable）、channel、releaseDate。候选尚未发布时releaseDate为null，buildDate记录真实构建日期。不要把候选改成正式发布，除非完成对应验收。

如改为GitHub Releases托管，将downloadUrl改成真实HTTPS APK地址，保留准确sizeBytes和sha256。local APK在Build时校验大小/哈希；配置外链时，维护者须在发布前验证下载与摘要。旧APK默认保留，不自动清理。当前JSON中的 `../downloads/...` 和 `../changelog` 相对 `/releases/latest.json` 文件解析，在根路径和项目子路径下均有效；第三方读取者应使用 `new URL(value, metadataUrl)`，不要相对当前页面解析。

## 添加更新日志

编辑src/data/history.json：新增latest记录、归档原版本，分别填写added/improved/fixed与验证边界note。页面与/releases/history.json共用数据。具体例子见content/changelog/README.md。

## 设计与测试

DESIGN.md记录用户指定的LUOXU Design V2品牌移植：暖白、灰绿、细线和开放排版。本网站不表示Android的Design V2已确认或实装。首屏可切换展示为功能示意，明确不是正式截图。

```sh
npx playwright install chromium
npm run test:e2e
```

测试375/390/412/768/1366/1440宽度、全部页面、导航、分类示意键盘、APK及版本接口、无障碍和reduced-motion。测试浏览器为隔离进程，不操作用户已有浏览器账号。截图及JSON结果写入docs。

## Deployment

默认目标是 **GitHub Pages + GitHub Actions + Astro Static Build**。工作流位于 `.github/workflows/deploy.yml`，参考 [Astro 官方指南](https://docs.astro.build/en/guides/deploy/github/)；使用官方 `withastro/action@v6` 安装、检查、测试、构建并上传 Pages artifact，由 `actions/deploy-pages@v5` 部署。每次 push 到 main 自动触发，亦支持 Actions → Run workflow 手动触发。

### 首次公开部署

1. 由维护者本人创建 GitHub 仓库（建议 `luoxu-web`，免费账号使用公开仓库）。本地已是独立 main 分支 Git 仓库，但没有远程、提交或推送。
2. 上传/推送项目源码和 lockfile，保留 public/downloads 下实际 APK；不上传 node_modules、dist、.env.local 或本机验收文件。
3. 仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**；如首次工作流因 Pages 尚未开启而失败，完成该设置后重新运行。
4. Actions 页面选择 Deploy LUOXU to GitHub Pages → Run workflow，或再次 push main。完成后以 GitHub 显示的真实页面地址为准。

工作流通过 `actions/configure-pages@v5` 自动读取真实 origin 和 base_path；通过 GitHub repository context 获得实际仓库链接，**不需要在源码里填写或猜测用户名**。默认项目站点为 `https://实际用户名.github.io/实际仓库名/`。如需公开反馈邮箱，在 Settings → Secrets and variables → Actions → Variables 新增 `PUBLIC_FEEDBACK_EMAIL`（普通公开 Variable，不是 API Key）。其他公开备案字段同 .env.example；未知留空。

本机模拟时复制 .env.example 为 .env.local，仅配置 `PUBLIC_SITE_URL=https://实际用户名.github.io` 与 `PUBLIC_BASE_PATH=/实际仓库名`，再 build / preview；origin 不包含仓库子路径。根路径默认值仍为 `/`，所有内部链接、图标、CSS、manifest、APK、SEO 和 sitemap 都通过统一路径处理，不需要批量替换代码。

### APK 与安全

现有 APK 61.9 MiB，小于 Git 单文件 100 MiB 上限，但超过浏览器文件上传 25 MiB 限制，因此 **首次请使用 Git 客户端推送整个独立项目，不能只靠网页拖拽上传 APK**。之后推荐 GitHub Releases 管理二进制，填入实际外链后再部署；不要使用 Git LFS 指针代替可下载 APK。当前文件仍完整保留，未改签名或内容。[GitHub 文件限制](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)

发布前按公开内容审核全部文件。`.gitignore` 已排除环境文件、私钥、签名 keystore、构建目录与本机验收日志。不要提交模型 Key、密码、个人聊天或用户数据库；LICENSE_PENDING.md 表示许可证尚未确定，公开仓库不等于已授予开源许可。

### Custom Domain（以后再做）

绑定真实自定义域名时，在 Pages 配置域名并完成相应 DNS / HTTPS 检查，工作流会读取新的 origin/base_path。若需要显式覆盖，在 Actions Variables 设置 `PUBLIC_SITE_URL=https://真实域名`、`PUBLIC_BASE_PATH=/`。本轮未创建 CNAME；仅在确认真实域名后才添加。无须重写页面或下载路径。

网站仍可把 dist 内容交给 Nginx / 任意静态服务器。Node 只用于构建，不是生产后台。本轮只完成本地配置与模拟测试，**没有创建远程仓库、登录授权、提交或公开部署**。

## License

项目整体License to be confirmed，见LICENSE_PENDING.md。依赖许可证及复用依据在THIRD_PARTY_NOTICES.md、docs/GitHub-First.md。保留package-lock.json并用npm ci复现。
