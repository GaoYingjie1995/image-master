<script setup lang="ts">
import { computed } from 'vue'
import fujifilmLogo from '../../assets/fujifilm-logo.svg'

const props = withDefaults(defineProps<{
  photoId?: number
  variant?: 'grid' | 'preview' | 'inline'
  tilt?: number
  caption?: string
  dateText?: string
  filmSim?: string
  showBadge?: boolean
  interactive?: boolean
  selected?: boolean
  colorLabel?: string | null
}>(), {
  variant: 'grid',
  showBadge: true,
  interactive: true,
  selected: false
})

// 确定性倾斜角度：基于 photo id hash，虚拟滚动中保持稳定
const tiltAngle = computed(() => {
  if (props.tilt !== undefined) return props.tilt
  if (!props.photoId) return 0
  const hash = ((props.photoId * 2654435761) >>> 0) % 401
  return (hash - 200) / 100 // -2.0 ~ 2.0
})

const isGrid = computed(() => props.variant === 'grid')
const isPreview = computed(() => props.variant === 'preview')
</script>

<template>
  <div
    class="polaroid-card"
    :class="[
      `variant-${variant}`,
      'group',
      {
        'polaroid-interactive': interactive,
        'polaroid-selected': selected
      }
    ]"
    :style="{
      '--tilt': `${tiltAngle}deg`
    }"
  >
    <!-- 选中态圆形勾选 -->
    <div v-if="interactive" class="polaroid-select" :class="{ 'polaroid-select-active': selected }">
      <span v-if="selected">✓</span>
    </div>

    <!-- 胶片模拟 badge -->
    <span v-if="showBadge && filmSim" class="polaroid-film-badge">{{ filmSim }}</span>

    <!-- 图片区域 -->
    <div class="polaroid-image">
      <slot />
    </div>

    <!-- 底部标注区（preview/inline 模式） -->
    <div v-if="(isPreview || variant === 'inline') && (caption || dateText || isPreview)" class="polaroid-caption-area">
      <!-- preview 模式显示 Fujifilm logo -->
      <div v-if="isPreview" class="polaroid-fuji-logo">
        <img :src="fujifilmLogo" alt="Fujifilm" class="polaroid-fuji-logo-img" />
      </div>
      <!-- 非 preview 模式显示文件名 -->
      <span v-else-if="caption" class="polaroid-caption">{{ caption }}</span>
      <span v-if="dateText" class="polaroid-date">{{ dateText }}</span>
    </div>
  </div>
</template>

<style scoped>
.polaroid-card {
  --polaroid-bg: #f2ede6;
  --polaroid-caption-color: #5a4a3a;
  --polaroid-date-color: #a09080;
  --polaroid-border-radius: 3px;
  --polaroid-image-bg: #252220;
  --polaroid-select-border: #b8b0a8;
  --polaroid-select-active-bg: #c0392b;
  --polaroid-selected-outline: #c0392b;
}

.polaroid-card {
  position: relative;
  background: var(--polaroid-bg);
  border-radius: var(--polaroid-border-radius);
  transform: rotate(var(--tilt, 0deg));
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* Grid 变体：正方形 + 厚白边框 */
.variant-grid {
  padding: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2);
}

/* Preview 变体：更大的边框 + 底部标注空间 */
.variant-preview {
  padding: 14px 14px 48px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2);
}

/* Inline 变体：紧凑型 */
.variant-inline {
  padding: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}

/* 交互态 */
.polaroid-interactive {
  cursor: pointer;
}

.polaroid-interactive:hover {
  transform: rotate(0deg) translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.3);
  z-index: 10;
}

/* 选中态 */
.polaroid-selected {
  outline: 2px solid var(--polaroid-selected-outline);
  outline-offset: -1px;
}

/* 图片容器 */
.polaroid-image {
  width: 100%;
  border-radius: 1px;
  overflow: hidden;
  background: var(--polaroid-image-bg);
}

.variant-grid .polaroid-image {
  aspect-ratio: 1;
}

.variant-preview .polaroid-image {
  display: flex;
  align-items: center;
  justify-content: center;
}

.variant-inline .polaroid-image {
  aspect-ratio: 1;
}

/* 图片上的 Classic Chrome 滤镜 */
.polaroid-image :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: contrast(1.05) saturate(0.85) brightness(1.02) sepia(0.08);
}

/* 选中勾选按钮 */
.polaroid-select {
  position: absolute;
  top: -4px;
  left: -4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--polaroid-bg);
  border: 2px solid var(--polaroid-select-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: transparent;
  opacity: 0;
  transition: all 0.15s ease;
  z-index: 5;
}

.polaroid-interactive:hover .polaroid-select {
  opacity: 1;
}

.polaroid-select-active {
  opacity: 1 !important;
  background: var(--polaroid-select-active-bg);
  border-color: var(--polaroid-select-active-bg);
  color: #fff;
}

/* 胶片模拟 badge */
.polaroid-film-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.5);
  background: rgba(0,0,0,0.4);
  padding: 2px 6px;
  border-radius: 2px;
  z-index: 2;
  text-transform: uppercase;
}

/* 底部标注区 */
.polaroid-caption-area {
  position: absolute;
  bottom: 0;
  left: 18px;
  right: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
}

.polaroid-fuji-logo {
  opacity: 0.9;
  flex-shrink: 0;
}

.polaroid-fuji-logo-img {
  width: 80px;
  height: 48px;
  object-fit: contain;
}

.polaroid-caption {
  font-family: 'Caveat', 'Ma Shan Zheng', cursive;
  font-size: 18px;
  color: var(--polaroid-caption-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.polaroid-date {
  font-family: 'Space Mono', monospace;
  font-size: 14px;
  color: var(--polaroid-date-color);
  letter-spacing: 0.05em;
  margin-left: 8px;
  flex-shrink: 0;
}

/* 浅色主题适配 */
:global(.theme-light) .polaroid-card {
  --polaroid-bg: #faf7f2;
  --polaroid-caption-color: #3a2a1a;
  --polaroid-date-color: #8a7a6a;
  --polaroid-image-bg: #e8e2d8;
  --polaroid-select-border: #c8c0b8;
  --polaroid-select-active-bg: #c0392b;
  --polaroid-selected-outline: #c0392b;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.06);
}

:global(.theme-light) .polaroid-interactive:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.15), 0 12px 40px rgba(0,0,0,0.1);
}
</style>
