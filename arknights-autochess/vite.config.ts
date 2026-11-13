import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Preact 官方 Vite 插件：负责 JSX 转换与开发期 HMR。
// 关卡/干员数据是 content/ 下的 JSON，由 import.meta.glob 在构建时打包。
export default defineConfig({
  // 用相对路径，构建产物可以直接放在任意子目录下预览（例如 GitHub Pages 子路径）。
  base: './',
  plugins: [preact()],
  server: {
    port: 5173,
  },
});
