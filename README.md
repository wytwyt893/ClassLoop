# 大数据技术课程实践

本仓库以课程实践目录为根，包含当前项目 `ClassLoop/` 和暂时冻结的 `venture_agent/`。两套项目使用相互隔离的 Neo4j：ClassLoop 使用 Browser `7475`、Bolt `7688`；VentureAgent 使用 Browser `7474`、Bolt `7687`。

## Git 工作流

`大数据技术课程实践/` 是唯一需要维护的 Git 仓库根目录。`venture_agent/` 作为其中的普通目录保留；以后对它的修改也应在父级仓库提交，并只推送到 `wytwyt893/ClassLoop.git`，不要再使用或更新旧 VentureAgent 远端。

## 首次克隆后的准备

```powershell
py -m venv ClassLoop\backend\.venv
ClassLoop\backend\.venv\Scripts\python.exe -m pip install -r ClassLoop\backend\requirements.txt
npm.cmd --prefix ClassLoop\frontend ci

py -m venv venture_agent\backend\.venv
venture_agent\backend\.venv\Scripts\python.exe -m pip install -r venture_agent\backend\requirements.txt

Copy-Item ClassLoop\backend\.env.example ClassLoop\backend\.env
Copy-Item ClassLoop\frontend\.env.example ClassLoop\frontend\.env
Copy-Item venture_agent\backend\.env.example venture_agent\backend\.env
```

在 `venture_agent\backend\.env` 中填写 `DEEPSEEK_API_KEY`。两套 Neo4j 的端口、账号和数据卷相互独立，不需要保持密码一致。

## 启动

仅运行 ClassLoop 基础功能：

```powershell
.\start_classloop.ps1 -Mode Visual
```

运行 ClassLoop、VentureAgent 和 ClassLoop 自己的 Neo4j：

```powershell
.\start_classloop.ps1 -Mode Full
```

也可以从 `ClassLoop` 目录调用其中的同名脚本；它会转发到仓库根启动器。
