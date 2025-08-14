# Phigros RKS 查询器

这是一个为音乐游戏 Phigros 设计的非官方玩家数据查询与分析工具。项目基于 Nuxt.js 3 构建，允许玩家通过登录或上传存档文件来查看自己的游戏记录、计算 RKS (B27)、生成成绩分享图等。

## ✨ 核心功能

- **玩家登录**：通过 Phigros 账户绑定的 TapTap 登录，从官方服务器安全获取游戏存档。
- **RKS (B27) 计算**：自动计算并展示对 RKS 贡献最高的 27 首歌曲（Best 27）的详细信息。
- **成绩单生成**：一键生成 B27 成绩的分享图，方便玩家在社交媒体上展示。
- **全曲目成绩查询**：浏览玩家在所有歌曲中的最佳成绩、ACC、FC/AP 状态等。
- **歌曲信息浏览**：提供游戏内所有曲目的定数、谱师、插画师等信息。
- **存档构建**：允许在分析后重新构建存档文件（高级功能）。

## 🚀 技术栈

- **前端**:
  - [Vue 3](https://vuejs.org/)
  - [Nuxt 3](https://nuxt.com/)
- **后端**:
  - [Nuxt 3 Server Routes](https://nuxt.com/docs/guide/directory-structure/server)
  - [TypeScript](https://www.typescriptlang.org/)
- **核心依赖**:
  - `axios` / `node-fetch`: 用于执行 HTTP 请求。
  - `jszip`: 用于解析和创建 Zip 存档文件。
  - `dom-to-image-more`: 用于将前端成绩展示 DOM 转换为图片。
  - `file-saver`: 用于在浏览器端保存文件。
- **部署**:
  - 设计为在 [Cloudflare Workers](https://workers.cloudflare.com/) 上进行 Serverless 部署。

## 📂 项目结构

```
.
├───assets              # 静态资源，如自定义 CSS
├───components          # 可复用的 Vue 组件
├───layouts             # 布局文件
├───pages               # 应用页面与路由
│   ├───login.vue       # 登录页
│   ├───upload.vue      # 存档上传页
│   ├───b27.vue         # B27 成绩展示页
│   └───...
├───public              # 公共文件，如 favicon 和字体
├───server              # 后端逻辑
│   ├───api             # API 接口
│   │   ├───login.ts    # 登录逻辑
│   │   ├───get-save.post.ts # 获取存档
│   │   └───...
│   └───utils           # 后端工具函数（如存档加解密、解析器）
├───utils               # 前端工具函数
├───nuxt.config.ts      # Nuxt 配置文件
└───package.json        # 项目依赖与脚本
```

## 本地开发与部署

### 1. 环境准备

- [Node.js](https://nodejs.org/en/) (建议使用 LTS 版本)
- [npm](https://www.npmjs.com/) (通常随 Node.js 一起安装)

### 2. 安装依赖

克隆项目到本地，然后在项目根目录下执行以下命令：

```bash
npm install
```

### 3. 启动开发服务器

执行以下命令以启动本地开发服务器，默认访问地址为 `http://localhost:3000`。

```bash
npm run dev
```

### 4. 构建与部署

#### 构建项目

执行以下命令来为生产环境构建应用：

```bash
npm run build
```
该命令会将编译后的文件输出到 `.output` 目录。

#### 启动生产服务器

构建完成后，可以执行以下命令来启动生产模式的本地服务器：

```bash
npm run start
```

## ⚠️ 免责与使用声明

- **严禁用于作弊**：本工具旨在方便玩家进行数据分析、备份和管理，**严禁用于修改游戏数据以获取不公平优势（作弊）**。任何通过修改存档伪造成绩、解锁内容的行为都严重违反了游戏的用户协议。**此类行为可能导致您的游戏账户被封禁**，请珍惜您的游戏账号。

- **非官方项目**：本工具为爱好者开发，与 Phigros 官方（Pigeon Games）无关。

- **潜在风险**：本项目包含**修改和重新打包游戏存档**的功能。使用这些功能可能存在风险，包括但不限于**存档损坏、数据丢失、游戏无法正常读取存档或未知的账户问题**。

- **数据备份**：**请在执行任何存档修改操作前，务必备份您的原始存档文件！**

- **责任声明**：本项目开发者不对任何因使用（或滥用）本工具而造成的直接或间接损失负责。**所有功能请您自行承担风险**。
