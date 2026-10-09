# 珞序官网开发边界

- 这是独立的 luoxu-web 项目，不修改相邻珞序 Android 项目，不连接手机。
- 本机权威上下文位于当前用户 Documents/AI_CONTEXT；遵循根目录 DESIGN.md。
- 静态优先，无登录、数据库、遥测、追踪、API Key 输入或模型请求。
- App版本只取 public/releases/latest.json；官网版本只取 package.json。
- GitHub/邮箱/域名/备案信息未配置时明确显示未开放或隐藏；不伪造。
- v0.6.0 是电脑端已验证、真机待验收的候选版，不改写成正式发布。
- 产品界面示意需明确标注，不将未确认的Design V2稿宣传成正式App截图。
- 新增或更新APK必须核对版本、大小与SHA256；不要修改Android签名或源APK。
- 交付前运行 check、test、build、e2e和 designmd lint。
