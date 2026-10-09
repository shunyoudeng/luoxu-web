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

按钮 hover/focus 的颜色过渡为150ms。功能示意即时切换，文字保持可读与足够对比度。正文不依赖滚动动画出现。prefers-reduced-motion 时关闭非必要动画与平滑滚动。

## Responsive

1366/1440px 使用两栏首屏；768px 收窄字号与列宽；375/390/412px 使用单列、折叠菜单、横向自适应示意和纵向下载信息。按钮自动换行；320px 窄屏也保持内容不横向溢出。文章目录使用内联链接。

## Accessibility

提供跳到正文、语义标题、图片 alt、可见 focus 与原生键盘操作。功能示意 tab 支持箭头/Home/End并标记选中项。非交互入口采用对应语义；所有正文在关闭动画或缺少外部字体时仍可阅读。

## Content Principles

App 版本与网站版本分别管理，发布状态与验证范围对应。产品示意与真实截图、应用本地存储与模型数据传输保持明确区分。官网身份、用户数、合作信息和公开配置以实际资料为依据。隐私与安全边界见[安全规范](docs/security.md)，素材归属见[第三方声明](THIRD_PARTY_NOTICES.md)。
