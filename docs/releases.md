# APK 与更新日志维护

[返回文档目录](README.md)

## App 版本元数据

[public/releases/latest.json](../public/releases/latest.json) 是 App 版本、下载地址、安装包大小和 SHA256 的统一来源。网站版本单独维护在 package.json。

| 字段 | 含义 |
| --- | --- |
| `version`、`build` | App版本和构建号，与 APK Manifest 一致 |
| `channel`、`status` | 发布渠道与 candidate/beta/stable 状态 |
| `releaseDate`、`buildDate` | 发布日期与构建日期；未正式发布时 releaseDate 为 null |
| `downloadUrl` | 相对元数据文件的 APK URL，或实际 HTTPS 外链 |
| `changelogUrl` | 相对元数据文件的更新日志路径 |
| `sizeBytes`、`sha256` | 实际文件大小和校验和 |
| `minimumAndroid`、`minSdk`、`applicationId` | 安装要求和包名 |
| `verification` | 对应版本的验证范围 |
| `githubUrl` | 可选的实际仓库地址；未填写时为空 |

发布状态根据对应版本的验收结果维护。网站上线与 App 通过真机验收是两件不同的事。

## 替换本地安装包

使用 APK 维护脚本复制文件并更新大小、哈希和相对下载地址。以下是命令格式示例，路径、版本与构建号应替换为实际值：

```sh
npm run release:apk -- --file "/path/to/app.apk" --version 0.6.1 --build 20
```

脚本不编译、签名或修改 APK 内容，也不自动核对 Manifest；发布前核对实际包名、版本、最低系统要求及覆盖安装兼容性。`--date YYYY-MM-DD` 可设置实际构建日期。

`npm run build` 会验证本地 APK 的大小与 SHA256。候选构建可以下载，但应在 verification 和更新日志中保留验证边界。

## 相对地址

元数据中的路径相对 JSON 文件解析：

```js
const metadataUrl = 'https://shunyoudeng.github.io/luoxu-web/releases/latest.json';
const metadata = await fetch(metadataUrl).then(response => response.json());
const apkUrl = new URL(metadata.downloadUrl, metadataUrl);
```

`../downloads/...` 能适应 `/luoxu-web/` 子路径和以后域名根路径；页面组件通过相同规则生成下载链接。

## 使用 GitHub Releases

安装包只上传到公开官网仓库的 [Releases](https://github.com/shunyoudeng/luoxu-web/releases)，然后将 downloadUrl 改为实际 HTTPS 文件地址，并保留准确的 sizeBytes 和 sha256。外链下载需单独检查，构建脚本只校验本地安装包。

Git 历史会保存每次提交的二进制版本。长期发布推荐 Releases，而非持续把每版 APK 加入源码仓库。GitHub 网页上传限制为25MiB，普通Git单文件上限为100MiB；大于50MiB会收到建议性警告，详见[文件限制](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)。Git LFS 指针不等于可直接下载的 APK。

## 添加更新日志

更新 [src/data/history.json](../src/data/history.json)：

1. 把旧的 `latest` 条目改为对应版本号，并填写真实 period/channel。
2. 新建一个 `id: latest` 的条目，版本与日期仍由元数据提供。
3. 在 added/improved/fixed 中记录用户可感知的变化，note 记录验证范围。

页面与静态 `releases/history.json` 共用数据；已有记录继续保留。日期不确定时可以使用月份，避免推算发布日期。

当前 App 更新为 0.7.2 / build 30 / Public Beta（公测），合并发布0.7.1以来的课程与事务显示、自动同步及日历选择改进；最终APK放在官网仓库Releases Assets，latest.json使用该资源的HTTPS地址。本机与浏览器测试核对字节数、SHA-256；新版不加入网站Git历史，原历史APK继续保留。官网动画与布局沿用现有实现，本次仅更新发布内容。

## 发布边界

Android Source = PRIVATE；Website / Website Source / APK = PUBLIC。PUBLISHING_POLICY.json 和 AGENTS.md 持续有效，直至负责人明确要求恢复开源。公开APK只放官网仓库Releases，上传仅限APK和SHA256SUMS.txt；网站源码归档只含官网代码。不得修改Android visibility为Public，不复制应用/后端源码、Prompt实现、内部文档、数据库、凭据或缓存。构建运行 npm run check:public，发布后验证匿名下载及SHA256。
