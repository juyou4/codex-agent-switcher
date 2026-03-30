# Codex Agent Switcher

一个本地 Web UI，用于可视化管理和切换 [OpenAI Codex CLI](https://github.com/openai/codex) 的 Agents 配置。

A local web UI to visually manage and switch [OpenAI Codex CLI](https://github.com/openai/codex) agents.

---

## 功能 / Features

- 🤖 **三内置 Agent 预设** — default / worker / explorer，一键激活
- ✏️ **自定义 Agent** — 创建、编辑、删除 `~/.codex/agents/*.toml`
- 🔧 **常用字段支持** — `sandbox_mode`、`nickname_candidates`、`mcp_servers`、`model`、`model_reasoning_effort`
- 🛡️ **保留高级字段** — 编辑现有 agent 时，会保留 UI 未展示的其他配置键
- ⚙️ **全局 [agents] 配置** — `max_threads`、`max_depth`、`job_max_runtime_seconds`
- 📁 **项目级 Agents** — 加载指定项目的 `.codex/agents/` 目录
- 📋 **Agent 名称一键复制** — 便于在提示词中引用；运行中的子代理可在 Codex 会话里用 `/agent` 管理
- 🌓 **深色主题**，现代 UI

---

## 快速开始 / Quick Start

### 环境要求
- Node.js >= 18
- OpenAI Codex CLI 已安装（`~/.codex/` 目录存在）

### 安装与启动

```bash
# 克隆
git clone https://github.com/your-name/codex-agent-switcher.git
cd codex-agent-switcher

# 一键安装所有依赖并构建前端
npm run setup

# 生产模式启动（单端口，访问 http://localhost:3737）
npm start
```

### 开发模式

```bash
# 安装依赖
npm run setup

# 开发模式（后端热重载 + 前端 HMR）
npm run dev
# 前端: http://localhost:5173
# 后端 API: http://localhost:3737
```

---

## 环境变量 / Environment Variables

复制 `.env.example` 为 `.env` 并按需修改：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `CODEX_DIR` | `~/.codex` | Codex 配置目录路径 |
| `PORT` | `3737` | API 服务端口 |

```bash
cp .env.example .env
```

---

## 配置目录说明 / Config Directory

该工具读写以下文件：

```
~/.codex/
├── config.toml          # 全局配置（激活的 agent、[agents] 设置）
└── agents/
    ├── worker.toml      # 自定义/覆盖 agent
    └── my-agent.toml
```

**项目级 agents** 存放于项目根目录的 `.codex/agents/` 下，可在 UI 中通过"项目路径"输入框加载。

---

## Agent TOML 格式

```toml
name = "my-agent"
description = "What this agent does and when to use it."
developer_instructions = """
You are a specialized agent. Your job is to...
"""

# 可选字段
model = "gpt-5.4"
model_reasoning_effort = "high"   # minimal / low / medium / high / xhigh
sandbox_mode = "read-only"        # read-only / workspace-write / danger-full-access
nickname_candidates = ["Atlas", "Delta", "Echo"]

[mcp_servers.myServer]
url = "https://example.com/mcp"
```

现有 agent 文件中的其他受支持键（例如 `skills.config` 或更完整的 `mcp_servers` 配置）在通过 UI 编辑时会被保留，不会被覆盖删除。

---

## 技术栈 / Tech Stack

- **后端**: Node.js + Express + [@iarna/toml](https://github.com/iarna/iarna-toml)
- **前端**: React 18 + Vite + Tailwind CSS

---

## License

MIT
