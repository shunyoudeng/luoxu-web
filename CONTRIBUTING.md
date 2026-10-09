# 贡献指南

欢迎改进珞序官网的内容、可访问性、兼容性和开发体验。

## 提交问题

在 [Issues](https://github.com/shunyoudeng/luoxu-web/issues) 提供受影响页面、浏览器或设备、复现步骤、预期结果和实际结果。截图应遮住个人信息；安全注意事项见[安全规范](docs/security.md)。

## 参与开发

1. 阅读[开发指南](docs/development.md)、[架构说明](docs/architecture.md)和[设计规范](DESIGN.md)。
2. 围绕一个明确问题创建分支，保持修改范围清晰。
3. 验证类型、测试和生产构建；界面交互应同时检查手机、桌面和键盘操作。
4. 提交 Pull Request，说明变化的原因、结果和验证方式。

```sh
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

官网保持静态架构。涉及登录、数据上传、统计 SDK 或新的外部服务时，先通过 Issue 讨论设计和隐私影响。产品介绍应与可验证的应用能力一致，功能示意与真实截图分别标注。

## 许可证与归属

贡献按项目的 [Apache License 2.0](LICENSE) 提交。复用第三方素材或代码时保留来源和许可证说明，维护 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)；品牌归属见 [NOTICE](NOTICE)。

用户反馈统一邮箱：[luoxufeedback@163.com](mailto:luoxufeedback@163.com)。请先遮住隐私，不要附上 API Key 或密码；GitHub Issue 保留用于开发协作。
