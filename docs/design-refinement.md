# 视觉与动效精修

日期：2026-10-10。沿用 LUOXU Web Design V1 的配色、页面结构、细线和开放排版。

## 参考与复用

本次延续对 [Luotopia](https://github.com/ClosedWHU/Luotopia/tree/ec32c97d5569df7211481fd9f162750510c8e15f) 公开官网的代码审计，采用其集中式Token、组件状态和渐进降级的组织方法。审计快照提交于2026-10-09，作为有近期维护的参考；仓库README声明MIT，但快照缺少LICENSE正文，因此没有复制具体源码、品牌图形、截图或字体资源。

新增代码由本项目自行实现，使用浏览器原生CSS transitions与IntersectionObserver，无动画库、平滑滚动库或额外运行时依赖。浏览器能力依据：[cubic-bezier](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/easing-function/cubic-bezier)、[IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)。既有Astro（MIT）、TypeScript/Playwright（Apache-2.0）等许可继续按[第三方声明](../THIRD_PARTY_NOTICES.md)维护。

本项目原有品牌、图标、功能示意、路径处理和原生details继续复用；没有整合上游的Shader、Three、Lenis、玻璃或多层阴影实现。

## 实现

- Hero沿用原文与断行，调整行高，以既有深绿和500字重突出“自成秩序”。隐私宣言保留原文，前句缩为引子、后句强调；完整数据传输与本地存储说明保留。
- 按钮、导航、文字入口、更新/反馈/页脚链接与示意Tab采用统一动效。文字保持原生尺寸和位置；仅独立SVG图标上浮2px/放大1.02、按压0.985。软回弹使用CSS过渡，快速移入移出不排队。
- 普通功能行、下载面板、事务示意内容与隐私说明不加Hover位移。没有新增阴影、模糊或装饰动画。
- 导航活动状态保留细线，通过opacity/scaleX渐显与展开；不增加浮动胶囊或跨页面客户端路由。移动菜单支持Escape、外部点击、导航后关闭、宽屏关闭与aria-expanded同步。
- 少量装饰线条进入视口时播放一次，标题、面板和菜单文字不做缩放、位移或淡化。首屏与已可见内容不等待动画；无JS、缺少Observer或脚本失败时内容默认可见。没有滚动监听、劫持和循环动画。
- 示意面板共用网格空间，以最长内容决定高度；隐藏面板保持不可见且不可交互，键盘与辅助技术只访问当前面板。
- 动效统一于[Token文件](../src/styles/tokens.css)；hover限制真实鼠标设备，触屏仅按压，减少运动时禁用变换与非必要动画。下载元数据采用等宽数字，校验和触控高度统一48px。

## 验收入口

执行 `npm run check`、`npm run test`、`npm run build`、`npm run test:e2e`，以及 `designmd lint DESIGN.md`。

浏览器测试覆盖375/390/412/768/1366/1440px、Hover/按压/快速移入移出、导航焦点、触屏菜单关闭、Tab高度稳定、滚动入场一次性、减少运动、无JS/无Observer降级、无障碍、主要页面及资源加载。现有子路径测试验证GitHub Pages的链接、manifest、canonical、sitemap和APK地址。

测试截图、完整浏览器结果与本地预览属于本机验收产物，不进入公开仓库。具体验收结果由实际运行记录给出；模拟触屏不等于Android真机或所有浏览器引擎的验收。

## 本次验证结果

- Astro类型检查：44个文件，0错误、0警告；Design规范检查：0错误、0警告。
- 自动测试14项通过；Chromium浏览器测试25项全部通过，覆盖上述六档视口。
- 生产构建成功，仍为static output；子路径测试核对6条路由、12项链接资源、manifest/SEO和APK地址。
- 浏览器请求实际下载当前APK并核对体积与SHA-256；主要页面无控制台错误，axe无障碍检查通过。
- 浏览器检查确认Hover和按压过程中，文字所在元素的transform为none；图标保留微动，快速移入移出后恢复。
- package.json、lockfile、Astro配置、发布元数据、路径处理、更新数据及部署workflow的哈希与修改前一致。
- 不增加依赖，不修改Android源码；发布使用既有main分支GitHub Pages工作流。

验证使用本机Chromium与模拟触屏；Android真机、Safari/Firefox及真实设备帧率仍未实测。
