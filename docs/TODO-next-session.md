# 下个会话待办事项

## 1. 推送未推的代码

dev 分支有 4 个未推送的 commit：

```
970d397 perf: CI/CD 按路径过滤，只构建改动的服务
3348fcf feat: 构建版本号注入所有容器 + /api/health 返回版本
77658fe chore: 镜像只推 latest + ghcr.io 自动清理旧版本
8fe52c0 chore: 部署后清理旧镜像释放磁盘
```

main 也有未推送的 commit（node-forge 修复 + 镜像清理）。

操作：
```bash
git checkout dev && git push origin dev
# 确认后推 main
git checkout main && git merge dev --no-edit && git push origin main
```

## 2. 验证线上登录修复

node-forge 替换 crypto.subtle 的代码已提交但可能还没部署成功。部署后验证：
- 访问 `http://REDACTED_HOST`
- 点击登录，输入 mudasky / mudasky@12321.
- 确认登录成功

## 3. E2E 测试全覆盖

测试代码已改为"自给自足"模式（每个测试自己创建数据），但还没跑过完整验证。

需要：
- 先在本地跑一次确认全部通过（0 skip, 0 failed）
- 然后用 `BASE_URL=http://REDACTED_HOST` 跑线上 E2E
- 修复出现的问题

当前已知问题：
- global-setup 登录按钮点击需要重试（JS 水合延迟）
- 线上生产模式 vs 本地 dev 模式行为差异

## 4. 前端 UI 审查

前端新增了 3 个页面还没有人工审查：
- 案例详情页 `/cases/[id]`
- 院校详情页 `/universities/[id]`
- 文章栏目分流（study-abroad/visa/life/requirements 各有 `[id]` 页面）

需要在浏览器中实际查看这些页面的 UI 效果。

## 5. 清理过期文档

以下文档在功能完成后应删除（按项目规范）：
- `docs/superpowers/specs/2026-04-15-frontend-missing-features-design.md`
- `docs/superpowers/specs/2026-04-15-production-deployment-design.md`
- `docs/superpowers/plans/2026-04-15-frontend-features-and-e2e.md`
- `docs/superpowers/plans/2026-04-15-production-deployment.md`
- 本文件 `docs/TODO-next-session.md`

## 6. WSL 网络不稳定

WSL mirrored 网络模式下 HTTPS 到 GitHub 时通时断。如果推送失败，多重试几次或检查代理软件状态。
