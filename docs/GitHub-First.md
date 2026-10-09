# 技术选型依据

[返回文档目录](README.md)

## Astro 与静态架构

官网的核心内容是产品介绍、下载、版本记录和使用说明。Astro 可在构建时生成静态 HTML/CSS；功能示意只需要少量浏览器脚本。当前范围无需 React 运行时、SSR、数据库或用户后台。

页面布局与组件由项目内实现，设计依据见 [DESIGN.md](../DESIGN.md)。开发环境和安装版本由 package.json、package-lock.json 固定，而不是上游 main 分支。

## 官方部署组件

GitHub Pages 采用 Astro 官方 Action 进行安装、构建和 artifact 上传，GitHub 官方 Action 进行部署。实际 origin/base_path 来自 Pages 配置，不依赖写死的用户名。工作流和操作方法见[部署指南](GitHub-Pages.md)。

## 参考来源

- [Astro 安装说明](https://docs.astro.build/en/install-and-setup/)
- [Astro 源码与版本](https://github.com/withastro/astro)
- [Astro MIT 许可证](https://github.com/withastro/astro/blob/main/LICENSE)
- [Astro Pages 部署指南](https://docs.astro.build/en/guides/deploy/github/)
- [withastro/action 源码](https://github.com/withastro/action/blob/v6/action.yml)
- [configure-pages 输出定义](https://github.com/actions/configure-pages/blob/v5/action.yml)

依赖许可与素材归属见[第三方声明](../THIRD_PARTY_NOTICES.md)。初始调查的日期、版本快照和取舍记录保留在[阶段档案](archive/2026-10-09-technology-research.md)。
