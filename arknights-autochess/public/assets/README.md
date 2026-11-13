# public/assets/ —— 运行时静态资源（占位）

这里放**可以公开分发**的运行时资源（自制的占位图、CC0/OFL 授权的字体与音效）。

当前（M0）这里什么都没有：棋盘/格子/单位标记都是 PixiJS 的 `Graphics` 程序化画出来的，
所以没有美术资源也能启动。接入真实美术时：

1. 资源文件放这里（目录结构建议按 `sprites/`、`ui/`、`audio/`、`fonts/` 分）；
2. 在 `src/render/` 的 asset registry 里登记「资源 id → URL」；
3. **不要**把《明日方舟》官方素材提交进仓库（版权归鹰角，见 `NOTICE.md`）。
   个人研究用的本地素材放 `public/assets-local/`（已在 `.gitignore` 里），不要公开分发。

原始工程文件（PSD/AI/AEP/Blender）放仓库根目录的 `assets-src/`，导出件才进这里——
保持「源文件 / 导出件 / 代码」三分离。
