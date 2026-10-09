# 更新日志维护

当前由 `src/data/history.json` 管理，页面与 `/releases/history.json` 共享同一份数据。

- 最新一条 `id` 是 `latest`，版本和日期读取 `public/releases/latest.json`，避免多处写死。
- 发布下一版时，将原latest条目的id改成旧版本号，并填写真实period/channel；新建一条latest记录。
- 每条仅列对用户有意义的added / improved / fixed，不粘贴Git提交列表。
- 没完成真机验证的功能必须留在note中。没有确切发布日期时用月份，不补造某一天。

目前0.6.0 / 0.5.1 / 0.5.0记录来自现有App项目对应内测更新公告。
