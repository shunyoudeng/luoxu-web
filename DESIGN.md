---
version: alpha
name: LUOXU Web Design V1
description: 珞序校园AI助手的中文静态产品官网，继承用户指定的LUOXU Design V2品牌语言
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

本项目是官网，不是App的新UI实现。用户已指定继承 LUOXU Design V2：暖白纸色、微绿、细线、中文排版与隐性的珞珈身份。本轮将既有品牌规范移植到独立静态网站；不修改或确认Android设计稿。

## Design References

具体参考为现有珞序 Design V2 三个方向：A书页负责章节编号、正文行长和留白；B山水负责极少的抽象路径线；C时序负责下载信息、版本和事务时间的对齐。优先采用现有DESIGN.md，符合指定既有设计系统的例外，不额外要求选皮肤。不是完整复制任何营销模板。

## Colors

暖白neutral覆盖主页面，primary为正文，secondary为辅助说明，tertiary仅为主动作和重要时间。mist只用于功能示意中的重点事项与隐私段局部。outline承担分组而不是文字。文字色按纸色/白色/雾绿基础对比度核对；不用V2草案对比度不足的机会色。

## Typography

中文采用系统无衬线，标题400、重点500、正文16/1.7，中文字距0。英文辅助与小节序号少量Georgia，不下载外部字体，不冒用Apple字体。桌面主标题48/1.35，手机32/1.45，行长以18—28中文标题字和40—46正文汉字控制；页面正文最长45rem。文案是主体，不以巨型品牌字占满首屏。

## Layout

容器最大1160px，主边距24；手机20px，窄屏16px。章节96px，手机64px；章节编号与标题一起出现。首屏文字+单个功能示意，随后用开放行、线条和版面变化叙述产品，不做六个Feature卡墙。页脚和导航一致。

## Elevation & Depth

不用阴影、玻璃、渐变或Blur。边界由1px细线、局部浅底和空白表达。独立下载区域有细边框；普通介绍和更新记录不放卡片。

## Shapes

按钮4px，重点事务8px，示意设备12px；大区块和文章不用圆角盒子。山形SVG是原创线稿，不使用校徽或建筑照片，不暗示武大官方认证。

## Components

按钮至少48px，主按钮深绿；未配置链接用明确的非交互状态，禁止空href或假链接。导航活动项有下划线与aria-current。版本dl对齐，校验和可换行；分类以文字和编号承载。反馈不建表单或上传控件。Accordion使用原生details；移动导航也是原生details，无JS仍可用。状态包括可下载、配置缺失、候选版、404。

## Motion

主按钮hover/focus150ms颜色变化，不浮起。功能示意即刻切换，文字不做透明度动画，保持切换全程对比度，首屏细线可一次reveal但不要求滚动出现；不隐藏正文等待JS。无modal/loading请求；菜单即原生details。prefers-reduced-motion时禁用非必要动画和平滑滚动，不做视差或滚动劫持。

## Responsive

1366/1440：两栏首屏；768：收窄字号与列宽；375/390/412：单列，导航折叠，示意横向自适应，下载信息纵向排列；按钮自动换行。320：亦不得横向溢出。文章目录为内联链接，移动端不保留窄侧栏。

## Accessibility

跳到正文、语义标题、图片alt、可见focus、至少48px控件、aria-current、原生键盘操作。功能示意tab支持箭头/Home/End并实时标记选中；禁用项不伪装成链接。全部文字无需动画也可读，无外部字体、遥测或登录依赖。

## Do's and Don'ts

Do：清楚区分App版本和网站版本、候选与已验证、示意与正式截图、本地保存与AI传输；真实配置后再显示公共地址。

Don't：伪造用户数/Star/备案/合作、宣称全部数据不离开设备、默认采集统计、API Key表单、套用SaaS定价/评价结构、改Android代码或Design V2状态。
