# 词忆

一个自用的 Windows 桌面单词学习工具，基于 Tauri 2 + React 19 + TypeScript 构建。用大模型查词、收录生词，并用 FSRS 记忆算法安排复习，帮助按记忆曲线巩固词汇。

## 功能

- **查词收录**：输入单词或短语，调用大模型（OpenAI 兼容接口）一次性返回音标、词性、释义、变形、例句、用法说明等内容；查词结果以可编辑表单展示，保存前可手动修正 AI 的错误，也可以填写个人助记笔记。
- **记忆曲线复习**：基于 [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)（FSRS 算法，Anki 现行默认算法）安排复习计划，支持「重来 / 困难 / 良好 / 简单」四档打分。默认按「英译中」方向复习，添加单词时勾选「双向」可额外生成一张独立排期的「中译英」卡片。
- **词库管理**：分页表格浏览已收录单词，支持发音播放（浏览器 Speech Synthesis）。
- **词表导入**：内置初中、高中、四级、六级、考研、托福、SAT 乱序词表，可选择数量批量查词导入。
- **学习统计**：查看复习量、掌握情况等统计数据。
- **模型设置**：可在设置中配置 Base URL / API Key / Model，默认使用 DeepSeek 官方 API，同样支持任意 OpenAI 兼容接口（如本地 Ollama）。

## 技术栈

- [Tauri 2](https://tauri.app/)（Rust 外壳，Windows 桌面打包）
- React 19 + TypeScript + Vite 7
- Tailwind CSS v4 + shadcn/ui（Nova 预设）
- SQLite（通过 `tauri-plugin-sql` 本地存储单词与复习卡片）
- [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) 实现间隔重复调度
- LLM 请求通过 `@tauri-apps/plugin-http` 转发，避开 WebView 的 CORS 限制

## 数据存储

单词与释义存于 `words` 表（`detail_json` 保存结构化释义），每个单词对应一张或两张（双向时）复习卡片存于 `cards` 表，字段与 `ts-fsrs` 的 `Card` 结构一一对应。开发环境下数据库文件位于：

```
%APPDATA%\com.terrariver.englishbook\app.db
```

## 开发

```bash
npm install
npm run dev        # 启动前端开发服务器
npm run tauri dev  # 启动 Tauri 桌面开发模式
```

## 构建

```bash
npm run build
npm run tauri build
```

首次使用前需在左侧导航「设置」中填写大模型 API Key，才能进行查词与词表导入。
