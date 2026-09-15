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

如需真实模型回复，在 `venture_agent\backend\.env` 中填写 `DEEPSEEK_API_KEY`。未填写时完整环境仍可启动，验收 Agent 会明确显示“结构化降级”并保存失败原因，不能把该结果称为真实模型输出。两套 Neo4j 的端口、账号和数据卷相互独立，不需要保持密码一致。

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

## 最终验收入口

完整模式启动后打开：

```text
http://127.0.0.1:5173/acceptance
```

页面按三位助教分为三个独立站点：项目成果与逻辑、Agent V1→V2及F1/F2/F3随机抽测、工程证据索引。验收材料和现场操作说明位于 `acceptance/README.md`。

V2.2 不只包含验收页面：学生端新增课件证据问答，教师端新增 F4 课堂证据干预，管理员端新增 Agent 运行审计；VentureAgent 新增可追溯轻量 RAG、引用协议和 10 分钟重复请求缓存。使用与实测数据见 `acceptance/ITERATION_V2_2_PRODUCT_RAG.md`。
