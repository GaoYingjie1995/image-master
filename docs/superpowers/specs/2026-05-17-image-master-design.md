# Image Master — 照片管理平台设计规格

## 概述

Image Master 是一款面向摄影爱好者和专业摄影师的桌面照片管理软件，基于 Electron + Vue 3 构建，支持 macOS 和 Windows 双平台。核心解决摄影师在大量 RAW+JPEG 文件管理中的痛点：重复文件清理、RAW/JPEG 配对管理、高效选片与整理。

**目标用户**：摄影爱好者和专业摄影师（主要），普通用户（次要）
**预期规模**：1 万 ~ 10 万张照片库
**平台**：macOS + Windows

## 技术架构

### 分层结构

```
渲染进程 (Renderer Process)
  Vue 3 + Pinia + Vue Router
         ↕ contextBridge
IPC 通信层
         ↕
主进程 (Main Process)
  Node.js + 文件系统 + 数据库
         ↕
SQLite │ Sharp │ exifr │ crypto
```

### 技术栈

**前端**：Vue 3 (Composition API)、Pinia 状态管理、Vue Router、Tailwind CSS
**后端**：Electron 30+、SQLite (better-sqlite3)、Sharp 图片处理、exifr EXIF 解析、crypto 文件哈希

### 项目结构

```
image-master/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── index.ts
│   │   ├── ipc/           # IPC 处理器
│   │   ├── services/      # 业务服务
│   │   ├── db/            # 数据库层
│   │   └── utils/         # 工具函数
│   ├── preload/           # 预加载脚本
│   └── renderer/          # Vue 3 前端
│       ├── src/
│       │   ├── components/
│       │   ├── views/
│       │   ├── stores/
│       │   └── composables/
│       └── index.html
├── resources/             # 应用资源
└── electron-builder.yml
```

## 数据模型

### photos 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| file_path | TEXT | 文件绝对路径 |
| file_name | TEXT | 文件名 |
| file_size | INTEGER | 文件大小 (bytes) |
| file_hash | TEXT | 文件哈希 (去重用) |
| format | TEXT | 格式 (jpeg/raw/png/...) |
| raw_pair_id | INTEGER | 关联的 RAW/JPEG 配对 ID |
| width | INTEGER | 图片宽度 |
| height | INTEGER | 图片高度 |
| rating | INTEGER | 星级评分 (0-5) |
| color_label | TEXT | 颜色标签 |
| is_rejected | BOOLEAN | 拒绝标记 |
| created_at | DATETIME | 创建时间 |
| modified_at | DATETIME | 修改时间 |
| shot_at | DATETIME | EXIF 拍摄时间 |
| camera_model | TEXT | 相机型号 |
| lens_model | TEXT | 镜头型号 |
| iso | INTEGER | ISO 值 |
| aperture | REAL | 光圈值 |
| shutter_speed | TEXT | 快门速度 |
| gps_lat | REAL | GPS 纬度 |
| gps_lng | REAL | GPS 经度 |

### albums 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| name | TEXT | 相册名称 |
| folder_path | TEXT | 对应文件夹路径 |
| cover_photo_id | INTEGER | 封面照片 ID |
| description | TEXT | 描述 |
| created_at | DATETIME | 创建时间 |

### album_photos 表

| 字段 | 类型 | 说明 |
|------|------|------|
| album_id | INTEGER | 相册 ID |
| photo_id | INTEGER | 照片 ID |
| sort_order | INTEGER | 排序序号 |

### smart_albums 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| name | TEXT | 名称 |
| rules | TEXT | JSON 规则条件（见下方格式） |

**智能相册规则 JSON 格式**：
```json
{
  "operator": "AND",
  "conditions": [
    { "field": "camera_model", "op": "equals", "value": "Sony A7M4" },
    { "field": "rating", "op": "gte", "value": 4 },
    { "field": "shot_at", "op": "this_month" }
  ]
}
```
支持的操作符：equals、not_equals、gte、lte、contains、in、this_month、this_year
支持的字段：camera_model、lens_model、rating、color_label、is_rejected、format、iso、aperture、shot_at

### 文件哈希策略

两阶段去重算法：
1. **快速筛选**：文件大小 + 前 64KB 哈希 → 候选重复组
2. **精确比对**：候选组内全文件 SHA-256 → 确认重复

10 万张照片库首次扫描约 2-5 分钟（SSD），后续增量扫描秒级完成。

## 功能模块

### 模块 1：照片浏览与管理

**网格视图**
- 自适应缩略图网格（懒加载 + 虚拟滚动）
- 按日期/名称/大小/评分排序
- 多选模式（Ctrl/Shift 点击）
- 右键上下文菜单
- 拖拽到相册

**预览模式**
- 全分辨率快速预览
- 左右键/滚轮切换照片
- 缩放（适应窗口/100%/自由缩放）
- 快速评分（1-5 快捷键）
- 照片对比（并排/叠加切换）

### 模块 2：去重与清理

**重复照片检测**
- 选择扫描文件夹（支持子目录遍历）
- 两阶段哈希去重算法
- 分组展示重复照片（缩略图对比）
- 显示文件路径、大小、拍摄时间
- 逐组选择保留/删除哪个
- 批量操作：保留最新/最大/指定文件夹

**RAW/JPEG 清理**
- 扫描指定文件夹
- 识别 RAW+JPEG 配对（同名不同扩展名）
- 显示孤立 RAW 文件（无对应 JPEG）
- 预览后批量清理
- 设置：JPEG 删除时是否联动删除 RAW

### 模块 3：相册管理

**手动相册**
- 创建相册 = 创建同名文件夹
- 拖拽照片到相册 = 移动文件到相册文件夹
- 按相册浏览（左侧导航栏）
- 相册封面自动选取（第一张照片）
- 重命名相册 = 重命名文件夹
- 删除相册 = 删除文件夹及其内容（需二次确认）

**智能相册**
- 基于规则自动填充（不移动文件）
- 规则示例：相机型号=Sony A7M4、星级≥4 且日期=本月、镜头=85mm f/1.4
- 支持 AND/OR 组合条件

### 模块 4：评分与标签系统

**评分**：1-5 星评级（快捷键 1-5），0 = 未评分，支持批量评分
**颜色标签**：红/黄/绿/蓝/紫 5 色，可自定义颜色含义，按颜色筛选
**拒绝标记**：X 键标记拒绝，拒绝照片半透明显示，批量清理拒绝照片
**今日导入**：虚拟视图，按 created_at 日期为今天自动筛选（非物理文件夹）

### 模块 5：批量操作

**批量重命名**
- 模板变量：{date} {time} {camera} {lens} {iso} {seq}
- 示例：`20240115_A7M4_{seq:3}`
- 实时预览重命名结果
- 支持序号起始值和步长
- 保留原文件扩展名

**批量导出**
- 调整尺寸（按比例/指定宽高）
- 格式转换（JPEG/PNG/WebP/TIFF）
- 质量调节（1-100 滑块）
- 保留/清除 EXIF 元数据
- 输出到指定文件夹
- 导出进度条 + 预计剩余时间

### 模块 6：高级分析

**直方图**：RGB 三通道直方图、亮度直方图、实时更新、过曝/欠曝警告
**地图视图**：基于 GPS 坐标显示照片位置、聚合标记、点击标记查看照片、按地理区域筛选
**EXIF 智能分组**：按相机型号/镜头型号/拍摄日期/ISO 范围分组

### 模块 7：AI 智能标签

**场景识别**
- 基于 ONNX Runtime 本地推理
- 识别常见场景：风景/人像/建筑/动物/食物
- 自动添加场景标签
- 按场景筛选照片
- 完全离线运行，保护隐私

**人脸聚类**
- 检测照片中的人脸
- 提取人脸特征向量
- 聚类分组（同一人的照片）
- 用户命名人物
- 按人物筛选浏览

AI 功能为可选模块，首次使用时下载模型（约 50-100MB），所有推理在本地完成。

### 模块 8：设置与配置

- **关联删除**：JPEG 删除时是否同时删除同名 RAW（默认关闭）
- **RAW 格式支持**：CR2/CR3/NEF/ARW/ORF/RAF/DNG 等
- **缩略图缓存**：缓存位置、大小限制、清理策略
- **深色/浅色主题**
- **快捷键自定义**
- **语言设置**（中文/英文）

## UI 设计

### 设计风格

**电影暗房美学** — 专业摄影工具的视觉语言。

- **色彩**：深邃黑色底色 (#08080a) + 温暖琥珀色强调 (#d4a574)
- **字体**：Playfair Display（品牌标识）+ DM Sans（界面文字）
- **质感**：微妙的胶片颗粒纹理叠加
- **动效**：照片加载时层次感的淡入动画
- **样式方案**：Tailwind CSS，自定义设计令牌（colors、fonts）通过 tailwind.config.js 配置

### 主界面布局

```
┌─────────────────────────────────────────────────────────┐
│  Image Master PRO                           ↓ 导入  ⚙  │  标题栏
├────────┬──────────────────────────────────┬─────────────┤
│        │ 排序: 日期 名称 大小 评分  ▦ ☰  │             │
│ 浏览   │──────────────────────────────────│  照片预览    │
│ 所有照片│ 2024年1月15日 · 48张              │             │
│ 已评分  │ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │  文件信息    │
│ 今日导入│ │IMG │ │IMG │ │IMG │ │IMG │    │  DSC_0001   │
│ 已拒绝  │ │001 │ │002 │ │003 │ │004 │    │  25.3 MB    │
│        │ └────┘ └────┘ └────┘ └────┘    │  6720×4480  │
│ 工具   │ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │             │
│ 重复检测│ │IMG │ │IMG │ │IMG │ │IMG │    │  拍摄参数    │
│ RAW清理│ │005 │ │006 │ │007 │ │008 │    │  Sony A7M4  │
│ 批量重命名│ └────┘ └────┘ └────┘ └────┘    │  85mm f/1.4 │
│ 批量导出│                                  │  ISO 400    │
│        │                                  │             │
│ 分析   │                                  │  ★★★☆☆     │
│ 直方图 │                                  │  ●黄        │
│ 地图视图│                                  │             │
│ AI标签 │                                  │             │
│        │                                  │             │
│ 相册   │                                  │             │
│ ○旅行2024│                                │             │
│ ○婚礼纪实│                                │             │
│ ○城市风光│                                │             │
│ + 新建 │                                  │             │
├────────┴──────────────────────────────────┴─────────────┤
│  ● 就绪  已选择 0 张                     缓存 2.3GB    │  状态栏
└─────────────────────────────────────────────────────────┘
```

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| Space | 全屏预览 |
| ←/→ | 切换照片 |
| 1-5 | 星级评分 |
| R/G/B/Y/P | 颜色标签 |
| X | 拒绝标记 |
| Delete | 删除（确认后） |
| Ctrl+E | 导出 |

### 设计原则

- 深色主题为主（护眼，符合摄影行业习惯）
- 左侧导航固定，右侧内容自适应
- 信息面板可折叠（节省空间）
- 虚拟滚动保证万级照片流畅
- 操作可撤销（删除前确认）

## 支持的 RAW 格式

CR2、CR3、NEF、ARW、ORF、RAF、DNG、PEF、SRW、RW2

## 非功能需求

- 10 万张照片库下网格滚动流畅（60fps）
- 首次扫描 10 万张照片 < 5 分钟（SSD）
- 增量扫描 < 3 秒
- 缩略图缓存支持 10GB+ 存储
- 应用启动时间 < 3 秒
- 内存占用 < 500MB（正常浏览状态）
