# 阶段记录：初始技术选型调查

记录日期：2026-10-09。以下为历史原文，不作为当前操作指南；其中部署和许可证状态已发生变化。现行文档见[项目首页](../../README.md)和[文档目录](../README.md)。

---

# 技术选型与源码调查 · 2026-10-09

## 采用

Astro 7.3.8：直接复用框架，原创实现产品布局与内容。无React/数据库/服务端适配器。页面输出静态HTML，浏览器仅需功能示意的轻量tab脚本；导航、文章和下载不依赖客户端框架。

参考官方安装说明和基础项目结构；不复制营销模板、不导入默认卡片墙。更新日志为独立JSON数据，下载元数据为 public/releases/latest.json。

## 已检查的实际资料

- [官方安装与手动初始化](https://docs.astro.build/en/install-and-setup/)
- [源码 package.json](https://github.com/withastro/astro/blob/main/packages/astro/package.json)
- [MIT许可](https://github.com/withastro/astro/blob/main/LICENSE)
- [维护与版本](https://github.com/withastro/astro/releases)
- 调查时包版本：npm registry 7.3.8，Node要求>=22.12.0，实际本机Node24.21.0。
- GitHub package.json 最近一次变更：`3571e2d2e80a66764254fa9b7750704a150ca3f6`，2026-10-08T15:35:14Z。该commit仅作本次调查快照，安装包以package-lock.json的版本和integrity锁定，不拿main分支代替发布版本。

## GitHub Pages 配置补充

2026-10-09 核对 [Astro 官方部署指南](https://docs.astro.build/en/guides/deploy/github/)、[withastro/action v6 实际 action.yml](https://github.com/withastro/action/blob/v6/action.yml) 与 [configure-pages v5 输出定义](https://github.com/actions/configure-pages/blob/v5/action.yml)。采用官方 Action 进行安装、构建和 artifact 上传，官方 deploy-pages 进行部署。公开配置从实际 Pages origin/base_path 获取；本轮只配置本机项目，没有授权/登录或部署到远程。细节见 GitHub-Pages.md。

## 不采用

Next.js：这个版本没有登录、数据库或服务端交互；React运行时和完整Web App约定没有必要。

大型Landing组件模板/动画框架：与现有品牌和轻量维护目标不符。使用原生details和少量事件处理。

## 隐私、体积、许可与验证

无账号、追踪、Key输入、上传、模型请求。测试访问只对本机服务，不使用用户浏览器资料。开发工具依赖不会进入网页运行时，具体构建大小及审计结果见验收说明。Astro CLI通过项目脚本关闭构建期telemetry，不修改电脑全局配置。

npm audit结果保存在 npm-audit.json；不能把依赖许可证或维护活跃当作安全保证。项目自身License未确定，见LICENSE_PENDING.md。所有浏览器接口和信息链接只在实际配置之后启用。
