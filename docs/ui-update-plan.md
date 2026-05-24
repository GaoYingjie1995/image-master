# Image Master 富士胶片 UI 更新计划

> 设计风格：富士胶片 × 拍立得 | 设计稿：`docs/design-system-fuji-polaroid.html`

---

## 一、技术决策（已确认）

| # | 问题 | 决策 |
|---|------|------|
| D1 | Caveat 中文方案 | 引入 `@fontsource/ma-shan-zheng`，字体栈 `Caveat, Ma Shan Zheng, cursive` |
| D2 | Classic Chrome 滤镜 | 默认开启，在设置中可关闭 |
| D3 | 拍立得底栏 | 非正方形，修改 PhotoGrid 布局公式适配 |
| D4 | Light 主题拍立得 | 加阴影区分（非改边框色） |
| D5 | 经典模式回退 | 不需要，直接替换 |

---

## 二、变更范围总览

| 层级 | 文件数 | 说明 |
|------|--------|------|
| 设计 Token | 3 | main.css + tailwind.config.js + package.json |
| 布局组件 | 5 | TitleBar, Sidebar, StatusBar, Toolbar, SidebarNavGroup |
| 照片组件 | 5 | PhotoGrid, PhotoItem, PhotoPreview, ExifPanel + 新增 PolaroidCard |
| 相册组件 | 3 | AlbumDialog, AlbumTreeItem, SmartAlbumDialog |
| 通用组件 | 5 | BatchActionBar, ConfirmDialog, ContextMenu, RatingStars, ToastContainer |
| 清理组件 | 2 | DuplicateGroup, RawPairList |
| 页面视图 | 8 | AllPhotos, Settings, Cleanup, Duplicate, Map, BatchExport, BatchRename, Imports |
| 测试 | 3-5 | 新增布局计算测试、PolaroidCard 测试、设计 Token 测试 |
| **合计** | **~36 文件** | |

---

## 三、分阶段执行计划

### Phase 1：设计 Token 迁移 + 全局效果
> 先换肤 + 全局氛围效果，所有组件自动跟随变化

| 文件 | 变更内容 |
|------|----------|
| `package.json` | 移除 `@fontsource/playfair-display`、`@fontsource/dm-sans`；安装 `@fontsource/inter`、`@fontsource/caveat`、`@fontsource/space-mono`、`@fontsource/ma-shan-zheng` |
| `tailwind.config.js` | 色系：accent `#d4a574` → `#c0392b`(fuji-red)、`#d4a574`(fuji-warm)；字体：Playfair Display → Caveat + Ma Shan Zheng，DM Sans → Inter，新增 Space Mono；新增 polaroid 色系 |
| `styles/main.css` | CSS 变量全面替换为 Fuji 色值（dark + light 两套）；新增 `--fuji-*`、`--polaroid-*` 变量；添加胶片颗粒噪点 overlay（`body::after`，z-index: 1，pointer-events: none）；添加漏光渐变效果类；Light 主题下拍立得白框加阴影区分 |

**Light 主题 Fuji 色值映射（.theme-light）：**

| 变量 | Dark | Light |
|------|------|-------|
| `--bg-deep` | `#0c0b0a` | `#f5f0ea` |
| `--bg-primary` | `#141210` | `#faf7f2` |
| `--bg-secondary` | `#1c1a17` | `#f0ece4` |
| `--bg-tertiary` | `#252220` | `#e8e2d8` |
| `--bg-hover` | `#2e2b28` | `#ddd6ca` |
| `--fuji-red` | `#c0392b` | `#c0392b` |
| `--fuji-warm` | `#d4a574` | `#b8854a` |
| `--text-primary` | `#e8e0d4` | `#1a1610` |
| `--text-secondary` | `#9a9288` | `#6a6058` |
| `--text-muted` | `#6a6258` | `#9a9088` |
| `--polaroid-white` | `#f2ede6` | `#f2ede6` |
| `--polaroid-shadow` | `rgba(0,0,0,0.25)` | `rgba(0,0,0,0.12)` |

**检查点**：Phase 1 完成后，启动 `pnpm dev` 实际查看界面效果，确认色彩和字体在 dark/light 下都正常，再进入 Phase 2。

---

### Phase 2a：PolaroidCard 组件 + PhotoItem 集成
> 先建立拍立得卡片基础，保持正方形，不改间距

| 文件 | 变更内容 |
|------|----------|
| **新增 `PolaroidCard.vue`** | 独立拍立得卡片组件。Props: `variant: 'grid' \| 'preview' \| 'inline'`、`tilt?: number`、`caption?: string`、`showBadge?: boolean`、`interactive?: boolean`。白色厚边框 `#f2ede6`、双层 box-shadow、微倾斜（基于 id hash）、Classic Chrome 滤镜、hover 归正 + 浮起、选中态左上角圆形勾选、胶片模拟 badge。`variant: 'grid'` 保持 `aspect-square`，不使用底栏 |
| **PhotoItem.vue** | 集成 PolaroidCard（variant='grid'），移除原有样式，保持 `aspect-square`。倾斜角度用确定性 hash：`((id * 2654435761) >>> 0) % 401` 映射到 -2.0°~2.0°。选中态改用 PolaroidCard 内置的圆形勾选 |
| **PhotoGrid.vue** | 间距暂不变（gap 6px），最小列宽暂不变（160px），仅适配 PhotoItem 使用 PolaroidCard 后的视觉效果 |

---

### Phase 2.5：布局计算纯函数抽取 + 测试
> 在修改 PhotoGrid 布局参数前，先确保计算逻辑可测试

| 文件 | 变更内容 |
|------|----------|
| **新增 `utils/grid-layout.ts`** | 从 PhotoGrid.vue 中抽取纯函数：`calculateColumns(w, minW, gap)`、`calculateItemSize(w, cols, gap)`、`calculateGroupLayouts(groups, cols, itemSize, captionHeight, gap)`、`findVisibleItems(layouts, scrollTop, viewH, overscan)` |
| **新增 `tests/renderer/utils/grid-layout.test.ts`** | 布局计算纯函数测试：不同容器宽度的列数、item 尺寸、分组 Y 坐标累加、可见区域计算、overscan 扩展 |

---

### Phase 2b：PhotoGrid 间距调整 + 虚拟滚动适配
> 基于 Phase 2.5 的测试保障，安全地修改布局参数

| 文件 | 变更内容 |
|------|----------|
| **PhotoGrid.vue** | `GRID_GAP = 6` → `20`，`ITEM_MIN_WIDTH = 160` → `200`；引入 `POLAROID_CAPTION_HEIGHT` 常量（拍立得底栏高度）；布局公式改为 `itemHeight = size + captionHeight`；日期分组标题改用 Caveat/Ma Shan Zheng 手写体；导入 `grid-layout.ts` 纯函数替代内联计算 |
| **PhotoItem.vue** | `variant: 'grid'` 切换为带底栏的非正方形模式；底栏显示手写标注（文件名/日期） |
| **PhotoPreview.vue** | 预览改为拍立得卡片形态：白色边框容器 + 手写标注 + 日期戳；底部工具栏改为胶片参数风格（Space Mono）；背景加漏光效果；吐片进入动画 `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| **新增 `tests/renderer/components/PolaroidCard.test.ts`** | PolaroidCard 组件测试：渲染白框、手写标注、倾斜角度稳定性、hover 归正、滤镜应用、选中态 |

**PhotoGrid 布局公式变更：**

```typescript
// 旧：正方形
const itemSize = Math.floor((containerWidth - (cols - 1) * gap - padding * 2) / cols)
const rowY = rowIndex * (itemSize + gap)

// 新：非正方形（带底栏）
const itemWidth = Math.floor((containerWidth - (cols - 1) * gap - padding * 2) / cols)
const itemHeight = itemWidth + POLAROID_CAPTION_HEIGHT  // 宽度 + 底栏高度
const rowY = rowIndex * (itemHeight + gap)
```

---

### Phase 3：布局组件更新

| 文件 | 变更内容 |
|------|----------|
| **TitleBar.vue** | "Glint" → "FUJI" + "Image Master" 双行品牌；字体改为 Space Mono + Inter；import 按钮改为快门红 |
| **Sidebar.vue** | 品牌区改为 FUJI 风格；导航项 hover/active 色改暖棕；分隔线改 `border-film` |
| **SidebarNavGroup.vue** | active 态色改 `fuji-warm-dim` |
| **StatusBar.vue** | 背景偏暖棕调 |
| **Toolbar.vue** | 搜索框聚焦光晕改暖棕；排序按钮 active 态改暖棕 |

---

### Phase 4：通用组件更新

| 文件 | 变更内容 |
|------|----------|
| **BatchActionBar.vue** | 边框改 `border-film`；按钮色跟随 fuji；选中计数用暖棕 |
| **ConfirmDialog.vue** | 背景、按钮色跟随 fuji；危险操作用 `fuji-red` |
| **ContextMenu.vue** | 菜单背景偏暖棕；hover 态用暖棕；危险项用 `fuji-red` |
| **RatingStars.vue** | 星星色改为 `fuji-warm` |
| **ToastContainer.vue** | 色系跟随语义色；背景偏暖 |

---

### Phase 5：相册与清理组件

| 文件 | 变更内容 |
|------|----------|
| **AlbumDialog.vue** | 标题改用 Caveat + Ma Shan Zheng；按钮色跟随 fuji |
| **AlbumTreeItem.vue** | 封面缩略图加 Classic Chrome 滤镜；hover/active 色改暖棕 |
| **SmartAlbumDialog.vue** | 同 AlbumDialog 风格 |
| **DuplicateGroup.vue** | 缩略图用 PolaroidCard（variant='inline'）；堆叠效果展示重复组 |
| **RawPairList.vue** | 按钮色跟随 fuji |

---

### Phase 6：页面视图

| 文件 | 变更内容 |
|------|----------|
| **AllPhotos.vue** | 背景色跟随 token（自动） |
| **SettingsView.vue** | 表单元素色跟随 fuji；新增 Classic Chrome 滤镜开关 |
| **CleanupView.vue** | 背景跟随 |
| **DuplicateView.vue** | 背景跟随 |
| **MapView.vue** | 地图弹窗、marker 样式与 Fuji 色系统一 |
| **BatchExportView.vue** | 按钮、输入框、进度条跟随 fuji 色系 |
| **BatchRenameView.vue** | 同上 |
| **ImportsView.vue** | 列表和操作按钮跟随 fuji 色系 |

---

## 四、需要新增的文件

| 文件 | 用途 |
|------|------|
| `components/photo/PolaroidCard.vue` | 可复用拍立得卡片组件 |
| `utils/grid-layout.ts` | PhotoGrid 布局计算纯函数 |
| `tests/renderer/utils/grid-layout.test.ts` | 布局计算测试 |
| `tests/renderer/components/PolaroidCard.test.ts` | PolaroidCard 组件测试 |

---

## 五、不需要修改的文件

| 文件 | 原因 |
|------|------|
| `src/main/**` | 主进程代码，不涉及 UI |
| `src/preload/**` | IPC 桥接层，不涉及 UI |
| `stores/*.ts` | 数据层，不涉及样式 |
| `composables/*.ts` | 逻辑层，不涉及样式 |
| `router/**` | 路由层，不涉及样式 |
| `i18n/**` | 国际化文本，不涉及样式 |

---

## 六、已识别风险与应对

| 风险 | 等级 | 应对方案 |
|------|------|----------|
| PhotoGrid 非正方形布局 | 高 | Phase 2.5 先抽取纯函数并测试，Phase 2b 再改布局参数 |
| Caveat 中文支持 | 高 | 引入 Ma Shan Zheng 中文手写体，字体栈自动 fallback |
| Classic Chrome 滤镜性能 | 中 | 先实测；提供设置开关；`will-change: filter` 预分配 |
| 倾斜角度稳定性 | 中 | 确定性 hash `((id * 2654435761) >>> 0) % 401`，v-memo 无需额外依赖 |
| 密集网格倾斜视觉混乱 | 中 | 角度收窄到 ±2°；列数 >5 时自动禁用倾斜 |
| Light 主题拍立得白框 | 低 | 加深阴影区分；`--polaroid-shadow` 在 light 下为 `rgba(0,0,0,0.12)` |
| 胶片颗粒 z-index 冲突 | 低 | z-index 设为 1（低于所有模态），pointer-events: none |

---

## 七、执行顺序总览

```
Phase 1    设计 Token + 全局效果（颗粒、漏光）
   ↓       ← 检查点：pnpm dev 查看实际效果
Phase 2a   PolaroidCard + PhotoItem（保持正方形）
   ↓
Phase 2.5  布局计算纯函数抽取 + 测试
   ↓
Phase 2b   PhotoGrid 间距 + 虚拟滚动适配 + PhotoPreview 拍立得化
   ↓
Phase 3    布局组件（TitleBar, Sidebar, StatusBar, Toolbar）
   ↓
Phase 4    通用组件（BatchActionBar, ContextMenu, Dialog, Toast）
   ↓
Phase 5    相册与清理组件
   ↓
Phase 6    页面视图（含 Map, BatchExport, BatchRename, Imports）
```
