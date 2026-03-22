# Vercel 部署说明

1.  **准备 GitHub 仓库**:
    - 在 GitHub 上创建一个新的私有或公开仓库。
    - 将本项目的所有代码推送到该仓库。

2.  **在 Vercel 中连接**:
    - 登录 [Vercel](https://vercel.com/)。
    - 点击 "Add New" -> "Project"。
    - 导入你刚刚创建的 GitHub 仓库。

3.  **配置环境变量**:
    - 在 Vercel 的项目设置中，找到 "Environment Variables" 部分。
    - 添加一个新的变量：
      - Key: `DASHSCOPE_API_KEY`
      - Value: 你的百炼 API Key (例如 `sk-sp-...`)
    - 如果你想在 Vercel 内部预览，可以设置 `VERCEL=1`。

4.  **开始部署**:
    - 点击 "Deploy"。
    - Vercel 会自动识别并根据根目录下的 `vercel.json` 进行构建：
      - 前端将使用 Vite 构建。
      - 后端将作为 Python Serverless Function 运行。

5.  **注意事项**:
    - Vercel 的免费版（Hobby）对 Serverless Function 有 10 秒的默认执行限制（已在 `vercel.json` 中尝试提升至 60 秒，但这通常需要 Pro 版生效）。
    - 由于 Vercel 函数是无状态的，上传的 PDF 文件和提取的图片将存储在 `/tmp` 目录中，在函数休眠后会丢失。建议每次处理前重新上传。
    - 如果任务处理时间过长，可能会导致超时。对于生产环境，建议将后端部署在独立的云服务器或使用专门的异步任务队列。
