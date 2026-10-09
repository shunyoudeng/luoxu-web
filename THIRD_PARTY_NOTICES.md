# 第三方声明

官网源码与文档采用 [Apache License 2.0](LICENSE)，归属说明见 [NOTICE](NOTICE)。第三方组件保留各自许可证；精确依赖版本与完整依赖图由 [package-lock.json](package-lock.json) 固定。

## 主要依赖与开发工具

| 组件 | 锁定版本 | 许可证 | 用途 |
| --- | --- | --- | --- |
| [Astro](https://github.com/withastro/astro) | 7.3.8 | MIT | 静态页面构建 |
| [TypeScript](https://github.com/microsoft/TypeScript) | 5.9.3 | Apache-2.0 | 类型检查 |
| [@astrojs/check](https://github.com/withastro/astro) | 0.9.10 | MIT | Astro 类型检查 |
| [Playwright](https://github.com/microsoft/playwright) | 1.64.0 | Apache-2.0 | 浏览器测试 |
| [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm) | 4.13.0 | MPL-2.0 | 无障碍测试 |
| [axe-core](https://github.com/dequelabs/axe-core) | 4.13.0 | MPL-2.0 | 无障碍规则引擎 |
| [@types/node](https://github.com/DefinitelyTyped/DefinitelyTyped) | 24.19.1 | MIT | 开发期类型定义 |

依赖的完整许可证文件随其安装包提供。类型检查、无障碍测试和 Chromium 测试浏览器不随静态网站发布。GitHub Actions 使用官方组件，工作流及上游链接见[部署指南](docs/GitHub-Pages.md)。

## 图形与字体

品牌图标沿用珞序 Android 项目的 `ic_campus.xml`，网站中的山形线稿与功能示意由项目内实现；没有使用武汉大学官方校徽或建筑照片。

网页采用访客设备的系统字体与 Georgia 回退字体，不分发字体二进制。OpenGraph 图片中的文字已经栅格化。

APK 是独立维护的 Android 应用分发文件；本声明不替代该应用的依赖和许可说明。
