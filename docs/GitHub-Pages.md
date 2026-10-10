# GitHub Pages 部署

[返回文档目录](README.md)

官网地址：<https://shunyoudeng.github.io/luoxu-web/>。站点通过 GitHub Actions 构建，部署源为 GitHub Pages。

## 自动部署

工作流位于 [deploy.yml](../.github/workflows/deploy.yml)，在以下情况运行：

- 推送到 `main` 分支。
- 在 [Actions](https://github.com/shunyoudeng/luoxu-web/actions) 中手动运行 **Deploy LUOXU to GitHub Pages**。

流程为 checkout → 读取 Pages 配置 → 安装依赖 → 类型检查 → 自动测试 → 静态构建 → 上传 Pages artifact → 部署。使用官方 `withastro/action@v6`、`actions/configure-pages@v5` 和 `actions/deploy-pages@v5`，构建环境为 Node.js 24。

工作流拥有 `contents: read`、`pages: write` 和 `id-token: write` 权限，以 `github-pages` environment 发布；部署使用 GitHub 提供的身份，不需要额外维护个人 Token。

## 配置来源

`configure-pages` 自动提供实际 `origin` 和 `base_path`。当前项目站点的 origin 是 `https://shunyoudeng.github.io`，base 是 `/luoxu-web`。产品源码链接由工作流中的 `PUBLIC_GITHUB_URL` 提供，与官网源码仓库地址分开维护；是否公开可用须以对应仓库的实际发布状态为准。

可在 **Settings → Secrets and variables → Actions → Variables** 设置公开配置：

| 配置 | 用途 |
| --- | --- |
| `PUBLIC_SITE_URL` | 覆盖自动获取的 HTTPS origin，不包含仓库子路径 |
| `PUBLIC_BASE_PATH` | 覆盖 base；项目站点用 `/luoxu-web`，域名根路径用 `/` |
| `PUBLIC_GITHUB_URL` | 官网源码仓库链接；与官网源码仓库分开维护 |
| `PUBLIC_FEEDBACK_EMAIL` | 官网反馈邮箱 |
| `PUBLIC_GITHUB_RELEASES_URL` | 单独指定 Releases 入口 |
| `PUBLIC_ICP_NUMBER` | 适用时填写实际备案信息 |
| `PUBLIC_POLICE_RECORD`、`PUBLIC_POLICE_RECORD_URL` | 适用时填写实际公安备案信息与链接 |

`PUBLIC_HOSTING_PROVIDER=github-pages` 由工作流设置，用于隐私页的托管说明。公开变量的完整列表见 [.env.example](../.env.example)，本地使用方法见[开发指南](development.md)。

## 子路径与链接

内部页面及资源通过 [统一路径模块](../src/lib/paths.mjs) 和 [URL 模块](../src/lib/urls.ts) 加上 base；Astro 处理构建资源的前缀。Manifest 使用相对文件路径。

App 元数据中的 `../downloads/...` 和 `../changelog` 相对 `releases/latest.json` 解析，适用于项目子路径及域名根路径。维护方法见[版本指南](releases.md)。

根目录构建不设置正式地址时，SEO 会使用 noindex；Pages 工作流读取真实地址后生成 canonical、OpenGraph URL 和 sitemap。项目站点的 robots.txt 位于子路径，不能替代 github.io 主机根目录的 robots.txt。

## 查看部署结果

在 Actions 打开对应运行记录，检查 build、deploy 两个 job。部署成功后检查官网、主要页面、安装包和版本 JSON。

如果 **Read actual Pages URL** 返回404，在 [Settings → Pages](https://github.com/shunyoudeng/luoxu-web/settings/pages) 确认 **Source = GitHub Actions**，然后重新运行失败任务。构建失败时查看具体步骤日志，按[本地开发指南](development.md)复现。

## 切换自定义域名

配置真实域名的 Pages 设置、DNS 和 HTTPS 后，工作流会读取新的 origin 和 base_path。需要覆盖时设置 `PUBLIC_SITE_URL=https://你的域名`、`PUBLIC_BASE_PATH=/`，重新部署即可。CNAME 仅在实际域名配置需要时维护，不用于默认 github.io 地址。

所有页面共用路径模块，因此切换域名无需逐页替换链接。当前构建仍是纯静态输出，`dist/` 也可以交给其他静态托管或 Nginx。

参考：[Astro 官方部署指南](https://docs.astro.build/en/guides/deploy/github/) · [GitHub Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) · [GitHub Pages 访问日志说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection)
