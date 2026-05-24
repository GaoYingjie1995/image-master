# Image Master

一款面向摄影师的桌面图片管理应用，基于 Electron + Vue 3 + TypeScript 构建。本地优先，数据全部存储在本地 SQLite 数据库中，无需联网。

## 功能特性

### 图片浏览

- **虚拟化网格** — 自定义虚拟滚动，支持按日期分组，轻松浏览海量照片
- **多种排序** — 按拍摄日期、文件大小、评分排序
- **搜索与筛选** — 文件名搜索、按日期/评分/拒绝标记筛选
- **RAW 自动隐藏** — 同目录下存在可渲染 JPEG 时，自动隐藏对应的 RAW 文件

### 图片预览

- 全屏预览，支持鼠标滚轮缩放（0.1x - 10x）和平移
- RAW 文件预览（通过 sharp 生成 2400px JPEG）
- 左右键导航浏览

### 评分与标记

- **星级评分** — 0-5 星，支持键盘快捷键和批量操作
- **颜色标签** — 红/黄/绿/蓝/紫 五种颜色
- **拒绝标记** — 快速标记不需要的照片

### 相册管理

- **普通相册** — 基于文件系统目录的树状相册，自动从导入目录结构创建，支持折叠/展开和自定义封面
- **智能相册** — 基于规则的动态相册（AND/OR 逻辑），支持按相机、镜头、评分、格式、ISO 等条件筛选
- **导入文件夹管理** — 集中管理所有导入的文件夹来源，支持刷新、移除子文件夹、重新导入

### 清理工具

- **重复检测** — 两阶段哈希算法（快速哈希 + 全量 SHA-256），高效发现重复文件
- **RAW 清理** — 检测无对应 JPEG 的孤立 RAW 文件，一键清理

### 批量操作

- **批量重命名** — 模板变量支持：`{date}`、`{time}`、`{camera}`、`{lens}`、`{iso}`、`{seq}`
- **批量导出** — 支持 JPEG/PNG/WebP/TIFF 输出，可调质量、尺寸，可保留或剥离 EXIF

### 分析工具

- **地图视图** — 基于 Leaflet + OpenStreetMap，展示 GPS 标记的照片位置，支持聚合标记
- **直方图** — RGB + 亮度四通道直方图，检测高光/暗部溢出
- **对比视图** — 两张照片并排对比，支持同步缩放

### 其他

- **国际化** — 完整的中文/英文双语支持
- **深色主题** — 电影暗房风格 UI，暖金色强调色
- **自定义快捷键** — 所有操作快捷键均可在设置中自定义
- **安全协议** — 自定义 `local-photo://` / `local-thumbnail://` 协议，防止目录遍历攻击

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Electron 31.x |
| 前端 | Vue 3.5 + TypeScript + Pinia + Vue Router |
| 构建 | electron-vite + Vite 7.x |
| 数据库 | better-sqlite3（WAL 模式） |
| 图片处理 | sharp（缩略图/预览/导出/直方图） |
| EXIF 解析 | exifr |
| 地图 | Leaflet + leaflet.markercluster |
| 样式 | Tailwind CSS 3.x |
| 测试 | Vitest + @vue/test-utils |
| 包管理 | pnpm |

## 支持格式

**图片格式：** JPG, JPEG, PNG, WebP, TIFF, BMP, GIF

**RAW 格式：** CR2, CR3, NEF, ARW, ORF, RAF, DNG, PEF, SRW, RW2

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 10

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/your-username/image-master.git
cd image-master

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 常用命令

```bash
pnpm dev          # 启动开发服务器（Electron + Vite HMR）
pnpm build        # 构建生产版本
pnpm dist:win     # 打包 Windows x64 版本
pnpm dist:mac     # 打包 macOS 版本
pnpm test         # 监听模式运行测试
pnpm test:run     # 单次运行所有测试
pnpm typecheck    # TypeScript 类型检查
```

## 项目结构

```
src/
├── main/                  # Electron 主进程
│   ├── db/                #   数据库层（better-sqlite3，Repository 模式）
│   ├── ipc/               #   IPC 处理器（photos, albums, cleanup, settings, import-sources）
│   ├── services/          #   业务逻辑（scanner, thumbnail, hasher 等）
│   └── utils/             #   工具函数
├── preload/               # 预加载脚本（contextBridge 暴露 electronAPI）
├── shared/                # 主进程/渲染进程共享代码
└── renderer/              # Vue 3 前端
    └── src/
        ├── components/    #   组件（layout/, photo/, album/, cleanup/, common/）
        ├── stores/        #   Pinia 状态管理
        ├── views/         #   页面视图
        ├── composables/   #   组合式函数
        ├── i18n/          #   国际化资源
        └── router/        #   路由配置
```

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 预览选中照片 |
| `←` / `→` | 上一张 / 下一张 |
| `1` - `5` | 设置 1-5 星评分 |
| `X` | 标记/取消拒绝 |
| `H` | 显示直方图 |
| `I` | 显示 EXIF 信息 |
| `6` - `9` | 设置颜色标签 |
| `Delete` | 删除照片 |
| `Escape` | 关闭预览 |
| `Z` | 切换 1x/2x 缩放 |
| `Ctrl+Click` | 切换选中 |
| `Shift+Click` | 范围选择 |

> 所有快捷键可在「设置 > 快捷键」中自定义。

## 截图

> TODO: 添加应用截图

## 架构设计

### IPC 通信

采用 Electron 标准的三层通信模式：

```
渲染进程 (window.electronAPI)  ←→  预加载脚本 (contextBridge)  ←→  主进程 (ipcMain.handle)
```

通道命名约定：`模块:操作`，如 `photos:getAll`、`albums:create`。

### 数据库

SQLite（better-sqlite3），WAL 模式，主要表结构：

- `photos` — 照片元数据（23 列，含 EXIF、GPS、评分、标签、`parent_folder`）
- `albums` — 相册，支持树状层级（`parent_id` 自引用），映射到文件系统目录
- `smart_albums` — 智能相册规则（JSON 存储）
- `settings` — 应用设置（键值对）
- `import_sources` — 导入文件夹来源管理
- `import_removed_folders` — 已移除的导入子文件夹记录

照片与相册通过 `photos.parent_folder` 与 `albums.folder_path` 路径匹配关联，无需额外关联表。

### 安全机制

- 自定义协议 `local-photo://` 仅提供数据库中存在的照片，`local-thumbnail://` 仅提供缓存目录内的缩略图
- 使用 `realpathSync` 解析符号链接，防止目录遍历
- 批量重命名/移动操作包含补偿事务，失败时自动回滚

## 许可证

MIT
