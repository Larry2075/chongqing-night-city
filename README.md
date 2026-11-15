# 雨夜重庆 · 两江夜游

[打开在线城市](https://larry2075.github.io/chongqing-night-city/) · [直接自由探索](https://larry2075.github.io/chongqing-night-city/?explore=1)

基于 Three.js 的重庆雨夜虚拟城市，覆盖戴家巷、洪崖洞、朝天门、来福士与两江沿岸。包括平面插画展开到三维的镜头、自由行走与飞行、桥上车流及轨道交通，以及 105 秒一镜到底路线（朝天门大桥 → 东水门大桥 → 来福士水晶连廊 → 千厮门大桥与 6 号线 → 洪崖洞）。

## 操作

- 电脑：WASD 移动，拖动画面转头，滚轮缩放；飞行时空格上升、Q 下降。
- 手机：选择「自由探索」，按住方向按钮移动，单指拖动转头，双指或 ＋／− 缩放；横向滑动地标列表选地点。
- 「一镜到底 · 1:45」支持播放、暂停、拖动时间轴与章节定位。

现代浏览器需支持 WebGL 2。手机默认降低渲染分辨率以控制 GPU 负载，保留完整城市与雨夜夜景。真实手机的流畅度取决于设备性能。此项目是风格化、近似复原，地图与楼高的具体依据及估算范围见网页的「街景、建筑与地图依据」。

## 开发与发布

```sh
npm ci
npm start
```

默认本地地址为 `http://127.0.0.1:8773/`。

```sh
npm run check
npm run check:corridor
npm run check:one-take
npm run check:landmarks
npm run build
PORT=8776 npm run preview
```

`dist/` 是可部署的静态网站，依赖与源代码打包为带内容哈希的文件。推送到 `main` 后，GitHub Actions 自动检查、构建并发布到 GitHub Pages；仓库 Settings → Pages 的 Source 使用 GitHub Actions。

此公开仓库由 Larry2075 管理，未授权其他协作者写入。公开访问意味着他人可以查看、Fork 或提交 Pull Request；这些操作不赋予对本仓库的直接写入权限。

本地视频成片、参考音频、音频虚拟环境及渲染缓存不属于网站发布包。

## 来源与许可

保留 Simcraft（MIT）与 Three.js（MIT）的许可；地图与地形数据来源见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) 及各数据文件中的说明。
