# 本地开发

[返回文档目录](README.md)

## 环境与运行

推荐 Node.js 24，最低版本 22.12.0。使用 npm 与仓库中的 package-lock.json 安装依赖：

```sh
npm ci
npm run dev
```

开发服务器默认地址为 <http://127.0.0.1:4321>。

```sh
npm run build
npm run preview
```

生产文件生成到 `dist/`。Preview 是本机验收工具，线上静态站点不运行这个进程。

Windows 用户可运行根目录的 [Start-Preview.ps1](../Start-Preview.ps1)，加 `-Production` 会先构建再预览。脚本优先使用当前 PATH 中的 npm；仅在存在相应本机工具链时使用备用路径。通常安装 Node.js LTS 并重新打开终端即可使用 npm。

## 公开配置

将 [.env.example](../.env.example) 复制为 `.env.local`，修改后重新构建。`PUBLIC_*` 都会成为公开站点信息，不用于保存凭据。

| Variable | 用途 |
| --- | --- |
| `PUBLIC_SITE_URL` | HTTPS origin；生成 canonical、OpenGraph URL 和 sitemap |
| `PUBLIC_BASE_PATH` | 部署子路径；根路径为 `/`，项目站点为 `/luoxu-web` |
| `PUBLIC_HOSTING_PROVIDER` | `github-pages` 会启用对应的托管隐私说明 |
| `PUBLIC_GITHUB_URL` | 产品源码仓库链接 |
| `PUBLIC_GITHUB_RELEASES_URL` | Releases 链接；留空时可从仓库地址推导 |
| `PUBLIC_FEEDBACK_EMAIL` | 反馈邮箱和 mailto 链接 |
| `PUBLIC_ICP_NUMBER` | 适用时填写的实际备案号 |
| `PUBLIC_POLICE_RECORD`、`PUBLIC_POLICE_RECORD_URL` | 适用时填写的实际公安备案信息 |

模拟现有官网部署的公开配置：

```dotenv
PUBLIC_SITE_URL=https://shunyoudeng.github.io
PUBLIC_BASE_PATH=/luoxu-web
PUBLIC_GITHUB_URL=https://github.com/shunyoudeng/luoxu-android
PUBLIC_HOSTING_PROVIDER=github-pages
```

`PUBLIC_SITE_URL` 不包含仓库子路径。正式地址未配置时，本地构建保持 noindex；未知邮箱或备案字段留空。Pages 的线上配置来源见[部署指南](GitHub-Pages.md)。

## 检查与测试

```sh
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

配置和静态构建测试覆盖根路径及 Pages 子路径、版本字段、APK 哈希和公开配置。浏览器测试覆盖六个页面、375/390/412/768/1366/1440 宽度、导航、键盘操作、无障碍与减少动态效果。

构建测试按顺序执行，避免并发使用同一 Astro 临时目录。浏览器测试使用独立 Chromium；测试前保持本机4321端口空闲。截图和验收产物留在本机，不提交公开仓库。
