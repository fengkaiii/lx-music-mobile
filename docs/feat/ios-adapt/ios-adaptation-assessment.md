# lx-music-mobile iOS 适配工作量评估

- **评估日期：** 2026-07-17
- **分支：** `feat/ios-adapt`
- **评估范围：** `ios/` 工程、自研 NativeModules、依赖 fork、JS/TS 业务层平台耦合
- **口径：** 1 名熟悉 React Native + iOS 原生的工程师；不含需求反复、审核驳回、第三方接口变更

## 结论

当前 `ios/` 基本是 React Native 模板壳，**不是可运行产品工程**。核心问题不是页面 UI，而是 Android 侧自研原生能力在 iOS 上几乎为零：启动、加密、自定义音源、文件系统、播放器定制都需要移植。

| 目标 | 人日 |
|------|------|
| 核心 MVP（能装、能播、在线源 + 自定义源、基础同步/设置；无桌面歌词，本地曲库受限） | **37–54** |
| + 本地音乐元数据与文档导入体验 | **47–69** |
| 完整功能对等（含桌面歌词对等，不推荐强上） | **60–90+** |
| + 上架合规 / CI / 打磨 | 再加 **7–10** |

**建议排期：**

- 单人全职 MVP：约 **8–11 周**
- 2 人（iOS 原生 + RN）并行：约 **5–7 周**
- 若自定义音源可延期，「能启动、能在线播歌」技术预览约 **3–4 周**

---

## 当前成熟度

| 维度 | 现状 |
|------|------|
| iOS 工程 | 无 `Pods/`、`Podfile.lock`；Bundle ID / 版本 / Icon / 签名仍为模板；AppDelegate 的 RN 0.73 与 RNN 接法需重整 |
| 自研原生模块 | Android 已注册 Utils、Crypto、UserApi、Cache、Lyric；iOS **0/5** |
| JS 平台隔离 | 几乎无 `.ios.ts` 分流；大量 Android 权限、SAF、悬浮窗、APK 更新 API 被直接调用 |
| Android 自研原生规模（约） | Lyric ~1942、UserApi ~541、Utils ~649、Crypto ~397、Cache ~208 LOC；iOS 对照实现为 0 |

---

## P0：阻塞构建 / 启动 / 核心业务

### 工程与依赖（约 5–7 人日）

- `pod install` 打通；建议关闭 Flipper
- `react-native-file-system`、`react-native-local-media-metadata` 的 podspec 指向不存在的 `ios/`
- 修正 AppDelegate（RNN 7.39.2 + RN 0.73）
- Info.plist：`UIBackgroundModes=audio`、`lxmusic://`、ATS/HTTP、字体 `icomoon.ttf`、隐私文案、Privacy Manifest
- Bundle ID、Team、版本与 `package.json` 对齐、App Icon

### 自研桥接（约 9–12 人日）

JS 在模块加载时解构 `NativeModules`，缺失会直接崩：

| 模块 | 用途 | 人日（估） |
|------|------|------------|
| CryptoModule | 音源加解密、同步加密 | 4–6 |
| UtilsModule | 退出、亮屏、设备名、通知权限、分享、窗口尺寸等 | 4–5 |
| CacheModule | 清缓存 | 0.5–1 |

### UserApi + QuickJS（约 10–15 人日，最高风险）

自定义音源依赖独立 JS 运行时。可选：移植 QuickJS iOS，或用 JavaScriptCore 重建兼容桥。默认源与社区脚本依赖此能力。

### 文件系统（约 8–12 人日）

`react-native-file-system` 无 iOS 实现；业务大量依赖 SAF / `content://` / 外置存储。iOS 需 DocumentPicker + 沙盒路径，并做 JS 平台分支。

### Track Player 定制（约 5–8 人日）

fork 在 iOS 缺 `updateNowPlayingTitles` / `isCached` / `getCacheSize` / `clearCache` 等；需补后台音频、锁屏控制、缓存行为。

**P0 小计：约 37–54 人日**

---

## P1：功能缺口（可分期）

| 项 | 建议 | 人日 |
|----|------|------|
| 桌面歌词 LyricModule | **产品降级**：隐藏 iOS 入口，保留应用内歌词（系统级悬浮窗无法对等） | 降级 1–2；对等 15–25 且体验难对齐 |
| local-media-metadata | 延后或单独移植（AVFoundation / TagLib） | 10–15 |
| APK 更新 / 电池优化 / Overlay | 隐藏或改商店更新 / `openSettings` | 含在跨端适配 7–12 |
| Toast、Safe Area、权限流、备份导入 | JS 平台分支 + DocumentPicker | 约 12–20（仅 JS，假设原生就绪） |

---

## 建议实施顺序

| 阶段 | 范围 | 验收 | 人日 |
|------|------|------|------|
| 1. 能启动 | 工程、Pods、AppDelegate、最小 Utils/Crypto | 冷启动进首页、无红屏 | 7–11 |
| 2. 能播歌 | Track Player、后台音频、在线源 | 前后台播放、锁屏控制、切歌 | 8–13 |
| 3. 自定义源 | UserApi + QuickJS | 默认源与手动导入源可取链 | 10–15 |
| 4. 文件与跨端 UI | DocumentPicker、备份、Safe Area、Toast、权限 | 核心设置与导入导出可用 | 8–12 |
| 5. 上架准备 | Icon、隐私清单、签名、CI、真机回归 | Archive / TestFlight | 4–7 |

**并行：** 阶段 1 完成前不宜大规模做 UI；原生推桥接，RN 做 Platform 分层与隐藏 Android 独占入口。

---

## 产品决策（影响工期）

| 决策点 | 建议 | 影响 |
|--------|------|------|
| 桌面歌词 | 不做对等移植 | 可省约 15–25 人日 |
| 本地曲库 | 第二阶段 | 可省约 10–15 人日（Day-1） |
| 自定义音源 | 若必须 Day-1 | 必须承担 QuickJS 10–15 人日与最高技术风险 |

---

## 验收清单（摘要）

**构建与启动：** Pod install、Simulator/真机构建、冷启动首页、横竖屏与安全区  

**播放：** 前后台、锁屏控制、耳机事件、缓存、切歌与进度  

**音源与文件：** 内置源、自定义源、脚本导入、备份导入导出、Document Picker  

**上架：** ATS、Local Network、后台音频、Privacy Manifest、Icon、Archive / TestFlight  

**不应出现：** 电池优化 / Overlay / SAF / 应用内 APK 安装等 Android 专用流程（或可安全跳过）

---

## 风险排序

1. UserApi / QuickJS 移植  
2. file-system iOS 实现  
3. 桌面歌词产品边界  
4. track-player 缓存与控制中心定制  
5. ATS / HTTP 音源与审核合规  

---

## 参考路径

| 类型 | 路径 |
|------|------|
| iOS 工程 | `ios/` |
| 自研桥 JS | `src/utils/nativeModules/` |
| 自定义音源 | `src/core/init/userApi/`、`src/core/userApi.ts` |
| 播放器 | `src/plugins/player/`、`src/core/player/` |
| 文件系统 | `src/utils/fs.ts`、`src/components/common/ChoosePath/` |
| 桌面歌词 | `src/utils/nativeModules/lyricDesktop.ts`、`src/core/desktopLyric.ts` |
| 功能对照 | `.cursor/skills/feature-code-map/SKILL.md` |
