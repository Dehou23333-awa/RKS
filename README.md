# RKS (Phigros 存档管理器)

一个基于 Nuxt 3 构建的网页应用，用于管理 Phigros 游戏的存档。它提供了 TapTap 登录、查看存档摘要和歌曲记录（包括 B27），以及上传 `save.zip` 存档文件的功能。

## ✨ 功能特性

*   **TapTap 登录:** 通过 TapTap 设备码流程进行安全登录，获取 Session Token。
*   **查看存档摘要:** 获取并显示当前 TapTap 账号下的 Phigros 存档摘要信息，包括存档版本、课题、RKS、游戏版本、头像和各难度等级数据。
*   **生成存档摘要:** 根据修改后的参数重新生成 Base64 编码的存档摘要。 
*   **查看歌曲记录:** 获取并解析存档中的歌曲记录，计算并显示 B27 数据和完整的歌曲成绩列表。
*   **上传存档文件:** 将本地的 `save.zip` 文件上传到游戏服务器，需要 Session Token 和生成的存档摘要。
*   **存档文件解析与构建:** 后端包含用于解析和构建 Phigros 存档文件（如 `gameRecord`, `user`, `settings` 等）的工具函数。

## 🛠️ 使用技术

*   **前端框架：** Vue 3 (Composition API)
*   **元框架：** Nuxt 3
*   **HTTP 客户端：** Axios, Fetch API
*   **文件压缩/解压：** JSZip (用于处理 `save.zip`)
*   **加密：** Node.js `crypto` 模块 (AES 解密)
*   **云存储交互：** Qiniu SDK, Axios (通过 TapTap/LeanCloud API)

## 依赖项目参考

本项目在开发过程中参考了以下开源项目：

*   **PhigrosLibrary:** `https://github.com/7aGiven/PhigrosLibrary` - 提供了关于 RKS 查询解密和存档上传的参考实现。
*   **Phi-CloudAction-python:** `https://github.com/wms26/Phi-CloudAction-python` - 提供了关于 Phigros 存档文件解密和加密的参考实现。

## 🚀 快速开始 (本地开发)

请确保您已安装 Node.js 和 npm/yarn/pnpm/bun。

1.  **安装依赖：**

    ```bash
    # npm
    npm install

    # pnpm
    pnpm install

    # yarn
    yarn install

    # bun
    bun install
    ```

2.  **运行开发服务器：**

    ```bash
    # npm
    npm run dev

    # pnpm
    pnpm dev

    # yarn
    yarn dev

    # bun
    bun run dev
    ```

    应用将在 `http://localhost:3000` 运行。

## 📝 使用说明

1.  **登录:** 访问登录页面 ，点击按钮生成设备码并扫描二维码在 TapTap 客户端授权。成功后 Session Token 将保存在 Cookie 中。
2.  **查看存档/B27:** 访问查询页面，Session Token 会自动从 Cookie 读取。点击按钮获取并显示存档摘要和歌曲记录。
3.  **上传存档:** 访问上传页面 ，Session Token 会自动从 Cookie 读取。您可以查看当前存档摘要，修改参数后点击“生成 Base64 存档摘要”，然后选择本地的 `save.zip` 文件，最后点击“上传存档”。

## ⚠️ 注意事项与免责声明

*   存档文件的解析和构建基于对游戏内部结构的理解，如果游戏更新导致存档结构变化，可能需要更新解析和构建逻辑。
*   上传功能会覆盖游戏服务器上的现有存档，请谨慎操作。
*   **本项目的存档修改功能仅供技术研究和学习使用，严禁用于任何商业用途或违反游戏服务条款的行为。**
*   **请勿将修改后的存档用于任何形式的作弊或不正当行为。**
*   **本项目不保证存档修改的正确性和安全性，使用前请务必备份原始存档文件。**
*   **严禁将修改后的存档上传到游戏服务器或用于任何其他目的，包括但不限于获取不正当利益、破坏游戏平衡等。**
*   **因使用本项目进行存档修改而产生的一切后果，由使用者自行承担，本项目作者不承担任何责任**