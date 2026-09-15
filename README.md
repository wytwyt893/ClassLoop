# 大数据技术课程实践

本仓库以课程实践目录为根，包含当前项目 `ClassLoop/` 和暂时冻结的 `venture_agent/`。两者在 Full 模式下共用 VentureAgent 配置的 Neo4j 实例（Browser `7474`、Bolt `7687`）。

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

在 `venture_agent\backend\.env` 中填写 `DEEPSEEK_API_KEY`。若修改 Neo4j 用户名或密码，请保持两套后端配置一致。

## 启动

仅运行 ClassLoop 基础功能：

```powershell
.\start_classloop.ps1 -Mode Visual
```

运行 ClassLoop、VentureAgent 和共享 Neo4j：

```powershell
.\start_classloop.ps1 -Mode Full
```

也可以从 `ClassLoop` 目录调用其中的同名脚本；它会转发到仓库根启动器。
