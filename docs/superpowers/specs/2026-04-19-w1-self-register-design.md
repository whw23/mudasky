# E2E 架构优化：W1 改为自注册账号 + 去掉 SEED_USER_E2E

## 背景

当前 W1 使用后端预设的种子用户 `SEED_USER_E2E` 进行 E2E 测试。该用户由 `seed_user.py` 在容器初始化时创建为 superuser。这导致：

- GitHub Actions 需要额外的 `SEED_USER_E2E_USERNAME` / `SEED_USER_E2E_PASSWORD` secrets
- 后端初始化代码有独立的 E2E 用户创建逻辑
- W1 是唯一一个不自注册的 worker，流程不统一

## 目标

- W1 改为自注册 E2E 账号，与 W2-W7 流程统一
- 删除 `SEED_USER_E2E` 相关的所有代码和配置
- W1-W7 所有 E2E 账号统一清理

## 设计

### 新的 E2E 启动流程

```text
global-setup:
  1. 清理数据库中 E2E 开头的旧数据（已有）
  2. 用 SEED_USER_1 密码登录 → 保存 W1 临时 auth state → 预热页面

W1: 注册 E2E 账号（手机号 +86-139${TS}01，用户名 E2E 前缀）
W7: 用 SEED_USER_1 密码登录 → 给 W1 的 E2E 账号赋权 superuser
W1: 刷新 token → 获得 superuser 权限 → 开始给 W2-W6 赋权
```

### 任务依赖链

```text
w1_register ─────────────────────────┐
w7_login_seed1 (SEED_USER_1 密码登录) ─→ w7_assign_superuser_w1
                                          requires: [w1_register, w7_login_seed1]
                                              ↓
                                      w1_refresh_superuser
                                          requires: [w7_assign_superuser_w1]
                                              ↓
                                      w1_assign_role_w2, w1_assign_role_w3, ...
```

### global-teardown 清理流程

1. 用 SEED_USER_1 密码登录（替代 SEED_USER_E2E）
2. 查询所有 `E2E` 前缀用户
3. 对 superuser 角色的 E2E 用户，先降级到 visitor 角色
4. 删除所有 E2E 用户（W1-W7）
5. 清理其他 E2E 数据（角色、分类、文章、案例、院校）

### SEED_USER_E2E 引用替换

| 引用位置 | 当前用 SEED_USER_E2E | 改为 |
|----------|----------------------|------|
| `w1/tasks.ts` w1_login | 密码登录 | 手机号自注册 |
| `w4/tasks.ts` w4_auth_login_success | 测试密码登录 | 改用 SEED_USER_1 |
| `w7/tasks.ts` w7_login_jwt | JWT 测试登录 | 改用 SEED_USER_1 |
| `global-setup.ts` 预热登录 | 密码登录 | 改用 SEED_USER_1 |
| `global-teardown.ts` 清理登录 | 密码登录 | 改用 SEED_USER_1 |
| `screenshots/capture.ts` | 密码登录 | 改用 SEED_USER_1 |

## 文件改动清单

### 前端 E2E

| 文件 | 改动 |
|------|------|
| `frontend/e2e/constants.ts` | PHONES 新增 `w1: +86-139${TS}01` |
| `frontend/e2e/global-setup.ts` | 登录改用 SEED_USER_1_USERNAME / SEED_USER_1_PASSWORD |
| `frontend/e2e/global-teardown.ts` | 清理登录改用 SEED_USER_1；删除前先降级 superuser 角色的 E2E 用户 |
| `frontend/e2e/w1/tasks.ts` | `w1_login` → `w1_register`（手机号注册）；新增 `w1_refresh_superuser` 任务（依赖 W7 赋权） |
| `frontend/e2e/w7/tasks.ts` | 新增 `w7_login_seed1`（SEED_USER_1 密码登录）+ `w7_assign_superuser_w1`（给 W1 赋权 superuser） |
| `frontend/e2e/w4/tasks.ts` | `w4_auth_login_success` 改用 SEED_USER_1 凭证 |
| `frontend/e2e/screenshots/capture.ts` | 改用 SEED_USER_1 凭证 |

### 后端

| 文件 | 改动 |
|------|------|
| `backend/scripts/init/seed_user.py` | 删除 SEED_USER_E2E 读取和创建代码（行 32-39） |

### CI/CD 和配置

| 文件 | 改动 |
|------|------|
| `.github/workflows/build.yml` | 删除 SEED_USER_E2E_USERNAME / SEED_USER_E2E_PASSWORD 两行 |
| `env/backend.env.example` | 删除 SEED_USER_E2E 两行 |
| `env/production.env.example` | 删除 SEED_USER_E2E 两行 |

## 不变的部分

- SEED_USER_1/2/3 的种子用户机制不变
- W2-W7 的自注册流程不变
- 后端 E2E 测试（pytest）已经用 SEED_USER_1，不受影响
- admin 用户删除的 superuser 保护逻辑已存在，不需要改动
