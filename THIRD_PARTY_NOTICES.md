# Third-party notices

本站页面、文案组织与图形布局是项目内实现，未复制整套Landing模板。整体许可证待维护者确认。

| Dependency | Version | License | Use |
| --- | --- | --- | --- |
| Astro | 7.3.8 | MIT | 构建静态HTML/CSS与少量交互JS |
| @astrojs/check | 0.9.10 | MIT | 开发期类型检查 |
| TypeScript | 5.9.3 | Apache-2.0 | 开发期类型检查 |
| Playwright | 1.64.0 | Apache-2.0 | 隔离测试浏览器，仅开发/CI |
| axe-core / @axe-core/playwright | lockfile版本 | MPL-2.0 | 开发期无障碍检查 |

依赖自身的许可证文本保留在 node_modules 中，精确依赖图由 package-lock.json 固定。未向网页访客发送测试依赖或统计SDK。Chromium测试程序也不随静态网站发布。

品牌图标来自相邻Android项目的 `ic_campus.xml`，保持其路径与色彩；不复制学校官方资产。网页不分发字体文件，仅使用访客设备系统字体；小节英文使用系统Georgia回退字体。OG图片使用本机已有字体栅格化，不分发字体二进制。

Upstream: https://github.com/withastro/astro/blob/main/LICENSE
