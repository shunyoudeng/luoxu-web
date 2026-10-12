---
version: alpha
name: LUOXU Web Design V1
description: 珞序校园AI助手的中文静态产品官网视觉规范
colors:
  primary: '#26352D'
  secondary: '#626F65'
  tertiary: '#245D50'
  neutral: '#F7F6F2'
  surface: '#FFFEFB'
  on-surface: '#26352D'
  outline: '#D5DDD4'
  error: '#A7443B'
  mist: '#EAF0E9'
typography:
  headline-display:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: 0px
  headline-lg:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0px
  headline-md:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0px
  body-lg:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.7
  body-md:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.7
  body-sm:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.65
  label-md:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0px
  label-caps:
    fontFamily: 'Georgia, serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.08em
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  section: 96px
  gutter: 24px
  margin: 24px
components:
  button-primary:
    backgroundColor: '{colors.tertiary}'
    textColor: '{colors.neutral}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.sm}'
    padding: '{spacing.md}'
    height: 48px
  button-secondary:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.primary}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.sm}'
    padding: '{spacing.md}'
    height: 48px
  nav-link:
    textColor: '{colors.secondary}'
    typography: '{typography.body-sm}'
    padding: '{spacing.sm}'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.md}'
    padding: '{spacing.lg}'
  table-row:
    textColor: '{colors.primary}'
    typography: '{typography.body-md}'
    padding: '{spacing.md}'
  privacy-statement:
    backgroundColor: '{colors.mist}'
    textColor: '{colors.secondary}'
    typography: '{typography.body-md}'
    padding: '{spacing.lg}'
---

## Overview

珞序官网采用暖白纸色、灰绿、细线与中文排版，体现安静、有序的校园产品气质。本规范适用于官网，Android 应用的界面规范独立维护。

## Design References

视觉结构围绕书页、山水和时序组织：书页体现章节编号、正文行长和留白；山水以少量抽象路径线表达珞珈身份；时序体现版本、下载信息和事务时间的对齐。

## Colors

neutral 是主页面背景，primary 用于正文，secondary 用于辅助说明，tertiary 用于主动作和重要时间。mist 用于功能示意的重点事项及隐私段局部，outline 用于分组。文字在纸色、白色和雾绿背景上保持足够对比度。

## Typography

中文采用系统无衬线字体，标题400、重点500、正文16/1.7，中文字距0。英文辅助与小节序号少量采用 Georgia 回退字体。桌面主标题48/1.35，手机32/1.45；标题行长约18—28个汉字，正文行长约40—46个汉字，最长45rem。

## Layout

容器最大宽度1160px，主边距24px；手机20px，窄屏16px。章节间距96px，手机64px，章节编号与标题共同构成阅读层次。首屏为产品说明与一个功能示意，后续采用开放行、细线和版面变化。导航与页脚保持一致。

## Elevation & Depth

边界由1px细线、局部浅底和留白表达。下载区域使用细边框；普通介绍与更新记录采用开放排版。视觉系统不使用阴影、玻璃效果、渐变或模糊层。

## Shapes

按钮圆角4px，重点事务8px，示意设备12px。文章与大区块采用开放边界。山形 SVG 为项目内线稿，不使用学校官方校徽或建筑照片。

## Components

按钮高度至少48px，主按钮深绿；未配置入口显示为非交互状态。导航活动项有下划线与 aria-current。版本信息使用对齐的 dl，校验和可以换行。反馈通过明确的链接提供，不采用上传表单。

折叠说明和移动导航使用原生 details。组件状态包含可下载、配置缺失、候选版和404。功能示意与实际产品截图分别标注。

## Motion

2026-10-10 Refinement：沿用现有品牌与结构，增加明确可交互入口的颜色、细线与独立图标反馈。纯展示行、卡片和隐私正文不使用 hover 位移。无阴影、玻璃、模糊或滚动劫持。

统一动效变量见 `src/styles/tokens.css`：Micro 120ms、Fast 180ms、Standard 240ms、Emphasized 360ms；标准曲线(.2,0,0,1)、退出曲线(.22,1,.36,1)、软回弹曲线(.22,1.18,.36,1)。仅独立SVG图标上浮2px、放大1.02、按压0.985；文字所在控件保持原生尺寸、位置和不透明度。退出平稳，快速经过时CSS过渡从当前值反向，不排队累积动画。

导航保留细线活动状态，hover/focus时线条轻展开与渐显，不增加滑动胶囊。移动菜单保留原生details并支持Escape、外部点击与宽屏关闭。

首屏与已可见区域不播放滚动入场；少量装饰线条进入视口时只播放一次，文字不做缩放、位移或淡化，正文默认完全可见。功能示意各面板共用网格占位，避免切换改变容器高度。无JS或无IntersectionObserver仍可正常阅读。

hover仅用于hover:hover且pointer:fine设备。触屏使用按压反馈；prefers-reduced-motion禁用位移、缩放、入场和非必要过渡。

## Responsive

1366/1440px 使用两栏首屏；768px 收窄字号与列宽；375/390/412px 使用单列、折叠菜单、横向自适应示意和纵向下载信息。按钮自动换行；320px 窄屏也保持内容不横向溢出。文章目录使用内联链接。

## Accessibility

提供跳到正文、语义标题、图片 alt、可见 focus 与原生键盘操作。功能示意 tab 支持箭头/Home/End并标记选中项。非交互入口采用对应语义；所有正文在关闭动画或缺少外部字体时仍可阅读。

## Content Principles

App 版本与网站版本分别管理，发布状态与验证范围对应。产品示意与真实截图、应用本地存储与模型数据传输保持明确区分。官网身份、用户数、合作信息和公开配置以实际资料为依据。隐私与安全边界见[安全规范](docs/security.md)，素材归属见[第三方声明](THIRD_PARTY_NOTICES.md)。


## Refinement Typography

Hero保持48px桌面/32px手机字号与原有断行，行高微调为1.45；“自成秩序”使用500字重和既有深绿，中文不加负字距。隐私宣言前句使用0.82em作为引子，后句500字重，保留原文与全部数据传输说明。日期、下载元数据按需要采用tabular-nums，不分发新字体。

## Refinement V2 (2026-10-11)

Apple-style editorial pass, same palette. Type voices (system fonts only, nothing distributed): heavy sans 700-800 for statements, Songti 900 for accent phrases (e.g. 自成秩序), Kaiti for poetic lines, Georgia italic for English labels and numerals. Hero uses clamp(36px, 6.6vw, 88px); chapter titles clamp(32px, 5.4vw, 72px), small tight tracking (-0.025em) at display sizes only. This supersedes the earlier no-shadow/no-gradient rule for the homepage: soft shadows (--shadow-soft, --shadow-lift), a translucent sticky header, a dark privacy chapter and layered mountain ridges are allowed.

## Scroll Rules (2026-10-12，持续有效)

滚轮与触摸始终用于浏览页面：不使用 pin、sticky 停留或任何让页面“停住、只推进动画”的结构。叙事舞台（ORDER、NAME、隐私宣言）为普通文档流，到达阈值后由自身时钟完整自动播放，上滑越过阈值后加速反向恢复；同一时间轴只切换播放方向，快速往返不重播、不跳变。只保留不阻碍移动的轻量 scrub（首屏推镜、进度条、`data-glide` 舞台约0.75倍速滑行）。手机端舞台内容全部在文档流中排布，容器随内容增高，不用固定 100svh 裁切文字。

Layered arrival: elements carry data-layer (0 label, 1 headline, 2 lead, 3+ visual/detail); each layer is delayed 110ms (capped), so a section lands in about half a second. data-fx = scale | left | right sets the direction. Mountain ridges and the sun drift at different speeds on scroll via CSS scroll timelines (no scroll listener, no scroll hijacking). All of it is gated by html.js and disabled under prefers-reduced-motion.
