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


## 设计研究参考

本轮动效和排版组织参考了 [Luotopia公开官网](https://github.com/ClosedWHU/Luotopia) 的Token、状态及降级设计方法（审计快照 `ec32c97d5569df7211481fd9f162750510c8e15f`）。该快照README声明MIT但未包含LICENSE正文，未复制其源码、Logo或截图；新增交互由本项目自行实现。参考关系不产生新的运行时依赖。实现与验收说明见 [视觉与动效精修](docs/design-refinement.md)。


## V3 视觉重构新增（`feat/v3-visual-refactor`）

| 组件 | 版本 | 许可证 | 用途 |
| --- | --- | --- | --- |
| [three.js](https://github.com/mrdoob/three.js) | 0.180.0 | MIT | 首页/全站 3D 珞珈山场景（懒加载，约 130 KB gzip） |
| [GSAP + ScrollTrigger](https://github.com/greensock/GSAP) | 3.15.0 | GSAP Standard License（免费，网站可商用） | 滚动驱动动画、磁吸与弹性微交互 |
| [Lenis](https://github.com/darkroomengineering/lenis) | 1.3.26 | MIT | 带重量感的平滑滚动 |
| [Hanzi Writer Data](https://github.com/chanind/hanzi-writer-data) | 2.0.1 | Arphic Public License | “珞”“序”的真实笔顺与笔画方向（仅用于构建期） |
| [Noto Serif SC](https://github.com/notofonts/noto-cjk) | VF | SIL OFL 1.1 | 标题字体，构建期子集化为 25 KB woff2（`scripts/build-fonts.py`） |
| [Instrument Serif](https://github.com/Instrument/instrument-serif) / @fontsource | 5.x | SIL OFL 1.1 | 英文斜体点缀 |

山体、松树、阔叶树和岩石均为项目内程序化原创建模，未使用外部模型或照片。


## V4 抽象山体与动效精修新增（`feat/v4-abstract-art`）

| 组件 | 版本 | 许可证 | 用途 |
| --- | --- | --- | --- |
| [maath](https://github.com/pmndrs/maath/tree/maath@0.10.8) `easing.damp` | 0.10.8（约 20 行改写，见 `src/scripts/damp.ts`） | MIT（Copyright (c) 2022 Poimandres） | 临界阻尼弹簧（Game Programming Gems 4 §1.10 SmoothDamp），用于镜头惯性与鼠标跟随 |

动效机制研究参考了 [Aevion — Lidar Drone Scanning](https://drone.riotters.com/)（Riotters）：滚动进度经阻尼驱动镜头、鼠标仅转动视角（偏航/俯仰/横滚）、滚动停止后的轻微悬浮、能力段落的分段自动播放。仅参考公开页面的运动参数思路，未复制其代码、模型或素材。