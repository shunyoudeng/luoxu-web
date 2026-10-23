# 珞序官网开发边界

- 2026-10-23：负责人明确要求上线Windows独立仓库与三端官网信息。允许按既有DESIGN.md更新文案、Windows下载区、两端版本元数据；保持舞台结构、动画时间轴和视觉资产不变。Android/Windows源码均PRIVATE，仅官网源码与APK/EXE公开；私有仓库不作为普通用户源码入口。

- 2026-10-22：新增独立Windows客户端的二进制发布白名单与私有源码保护；相邻luoxu-desktop仍为PRIVATE。Android与Windows独立版本/Release标签，官网只允许固定命名EXE/APK及校验和，不镜像任何客户端源码或配置。本轮不改官网动画或页面。

- 这是独立的 luoxu-web 项目，不修改相邻珞序 Android 项目，不连接手机。
- 本机权威上下文位于当前用户 Documents/AI_CONTEXT；遵循根目录 DESIGN.md。
- 静态优先，无登录、数据库、遥测、追踪、API Key 输入或模型请求。
- App版本只取 public/releases/latest.json；官网版本只取 package.json。
- GitHub/邮箱/域名/备案信息未配置时明确显示未开放或隐藏；不伪造。
- App 发布状态与验证范围以版本元数据为准；网站上线不等于 App 真机验收。
- 产品界面示意需明确标注，不将未确认的Design V2稿宣传成正式App截图。
- 新增或更新APK必须核对版本、大小与SHA256；不要修改Android签名或源APK。
- 交付前运行 check、test、build、e2e和 designmd lint。

## 当前发布规则（2026-10-10，持续有效）

Android App Source = PRIVATE；Website = PUBLIC；Website Source = PUBLIC；APK Distribution = PUBLIC。以 PUBLISHING_POLICY.json 为准。直到负责人明确要求恢复 Android 开源，不得变更 Android 仓库为 Public。构建、CI、Tag 和发布继续正常进行；公开 APK 只放官网仓库 Releases，官网只发布自身代码、公开素材/说明和 APK，不复制 Android/后端源码、Prompt实现、内部文档、数据库、凭据或构建缓存。发布前检查仓库 visibility、产物白名单和匿名下载；不能将发布APK视作授权公开应用源码。保留 LICENSE、贡献基础和 Git 历史，恢复展示须负责人明确要求。本轮用户已明确授权跨两个项目修改并通过USB覆盖更新。
