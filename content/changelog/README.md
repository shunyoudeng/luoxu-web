# 更新日志数据

官网更新日志由 [src/data/history.json](../../src/data/history.json) 管理，页面和静态版本接口共享同一份数据。最新条目的版本与日期来自 [public/releases/latest.json](../../public/releases/latest.json)，下载面板的“本次更新”来自其中的 `highlights`。

完整维护流程见 [APK 与更新日志指南](../../docs/releases.md)。每条记录围绕用户可感知的 added / improved / fixed；note 可留空，只写对用户有用的平实提示。测试数量、构建、Lint、CI、签名、待真机验证等内部记录不写入，`npm test` 会拦截这类措辞。
