<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhotosStore } from '../stores/photos'
import { useSelectionStore } from '../stores/selection'
import { useToastStore } from '../stores/toast'
import { useAlbumsStore } from '../stores/albums'

const { t } = useI18n()

const photosStore = usePhotosStore()
const albumsStore = useAlbumsStore()
const selection = useSelectionStore()
const toast = useToastStore()

const template = ref('{date}_{camera}_{seq:3}')
const startSeq = ref(1)
const processing = ref(false)
const step = ref<'edit' | 'preview' | 'done'>('edit')
const previewItems = ref<{ id: number; oldName: string; newName: string; conflict: boolean }[]>([])
const results = ref<{ oldPath: string; newPath: string }[]>([])

const placeholders = [
  { key: '{date}', desc: '拍摄日期 (20240115)' },
  { key: '{time}', desc: '拍摄时间 (143022)' },
  { key: '{camera}', desc: '相机型号' },
  { key: '{lens}', desc: '镜头型号' },
  { key: '{iso}', desc: 'ISO 值' },
  { key: '{seq}', desc: '序号' },
  { key: '{seq:3}', desc: '三位数序号 (001)' }
]

const selectedPhotos = ref(photosStore.photos)

function loadSelected() {
  if (selection.count > 0) {
    selectedPhotos.value = photosStore.photos.filter(p => selection.selectedIds.has(p.id))
  } else {
    selectedPhotos.value = photosStore.photos
  }
}

// 客户端预览：应用模板变量生成新文件名
function generatePreview() {
  if (!selectedPhotos.value.length) return
  const items: { id: number; oldName: string; newName: string; conflict: boolean }[] = []
  const nameCount = new Map<string, number>()

  for (let i = 0; i < selectedPhotos.value.length; i++) {
    const photo = selectedPhotos.value[i]
    const ext = photo.file_name.substring(photo.file_name.lastIndexOf('.'))
    const baseName = photo.file_name.substring(0, photo.file_name.lastIndexOf('.'))

    let newName = template.value
    const shotDate = photo.shot_at ? new Date(photo.shot_at) : null
    newName = newName.replace(/\{date\}/g, shotDate?.toISOString().split('T')[0].replace(/-/g, '') || '')
    newName = newName.replace(/\{time\}/g, shotDate?.toTimeString().split(' ')[0].replace(/:/g, '') || '')
    newName = newName.replace(/\{camera\}/g, photo.camera_model || '')
    newName = newName.replace(/\{lens\}/g, photo.lens_model || '')
    newName = newName.replace(/\{iso\}/g, photo.iso?.toString() || '')
    newName = newName.replace(/\{seq:(\d+)\}/g, (_, pad) => {
      return (startSeq.value + i).toString().padStart(parseInt(pad), '0')
    })
    newName = newName.replace(/\{seq\}/g, (startSeq.value + i).toString())
    // 清洗路径分隔符
    newName = newName.replace(/[/\\]/g, '_')
    newName = newName + ext

    // 检测冲突
    const count = (nameCount.get(newName) || 0) + 1
    nameCount.set(newName, count)

    items.push({ id: photo.id, oldName: photo.file_name, newName, conflict: false })
  }

  // 标记冲突
  for (const item of items) {
    if ((nameCount.get(item.newName) || 0) > 1) {
      item.conflict = true
    }
  }

  previewItems.value = items
  step.value = 'preview'
}

async function handleRename() {
  if (!selectedPhotos.value.length || !window.electronAPI) return
  processing.value = true
  try {
    const ids = selectedPhotos.value.map(p => p.id)
    results.value = (await window.electronAPI.photos.batchRename(ids, template.value, startSeq.value)) as { oldPath: string; newPath: string }[]
    toast.success(t('toast.renameSuccess', { count: results.value.length }))
    step.value = 'done'
    await photosStore.refresh()
    await albumsStore.fetchTree()
  } catch (err) {
    toast.error(t('toast.renameFailed'))
  } finally {
    processing.value = false
  }
}

const hasConflicts = computed(() => previewItems.value.some(p => p.conflict))

loadSelected()
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-display text-xl text-accent mb-6">{{ $t('batchRename.title') }}</h2>

    <div class="max-w-2xl space-y-6">
      <!-- 模板输入 -->
      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('batchRename.template') }}</h3>
        <input v-model="template" type="text"
               class="w-full bg-bg-tertiary border border-white/5 rounded-lg px-3 py-2 text-sm text-text-primary font-mono outline-none focus:border-accent/30 mb-3"
               placeholder="{date}_{camera}_{seq:3}" />
        <div class="flex flex-wrap gap-2">
          <button v-for="p in placeholders" :key="p.key"
                  @click="template += p.key"
                  class="px-2 py-1 text-xs rounded bg-bg-hover text-text-secondary hover:text-accent transition-colors"
                  :title="p.desc">
            {{ p.key }}
          </button>
        </div>
      </div>

      <!-- 序号设置 -->
      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('batchRename.seqSettings') }}</h3>
        <div class="flex items-center gap-3">
          <label class="text-xs text-text-secondary">{{ $t('batchRename.startSeq') }}</label>
          <input v-model.number="startSeq" type="number" min="1"
                 class="w-20 bg-bg-tertiary border border-white/5 rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent/30" />
        </div>
      </div>

      <!-- 选中照片数 -->
      <div class="text-sm text-text-muted">
        {{ $t('batchRename.willRename', { count: selectedPhotos.length }) }}
        <span v-if="selection.count > 0" class="text-text-muted">{{ $t('batchRename.selected') }}</span>
        <span v-else class="text-text-muted">{{ $t('batchRename.all') }}</span>
      </div>

      <!-- 步骤 1: 预览 -->
      <div v-if="step === 'edit'" class="flex gap-3">
        <button @click="generatePreview" :disabled="!selectedPhotos.length"
                class="px-6 py-2.5 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50">
          {{ $t('rename.preview') }}
        </button>
      </div>

      <!-- 步骤 2: 预览结果 -->
      <div v-if="step === 'preview'" class="space-y-4">
        <div v-if="hasConflicts" class="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <span class="text-sm text-red-400">⚠ {{ $t('rename.conflictWarning') }}</span>
        </div>
        <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
          <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('rename.previewTitle', { count: previewItems.length }) }}</h3>
          <div class="space-y-1 max-h-64 overflow-y-auto">
            <div v-for="(item, i) in previewItems" :key="i"
                 class="text-xs truncate flex items-center gap-2"
                 :class="item.conflict ? 'text-red-400' : 'text-text-muted'">
              <span class="text-text-secondary flex-1 min-w-0 truncate">{{ item.oldName }}</span>
              <span class="text-accent shrink-0">→</span>
              <span class="flex-1 min-w-0 truncate" :class="item.conflict ? 'text-red-400' : ''">{{ item.newName }}</span>
              <span v-if="item.conflict" class="text-red-400 text-[10px] shrink-0">{{ $t('rename.conflict') }}</span>
            </div>
          </div>
        </div>
        <div class="flex gap-3">
          <button @click="step = 'edit'"
                  class="px-4 py-2 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-hover transition-colors">
            {{ $t('rename.back') }}
          </button>
          <button @click="handleRename" :disabled="processing || hasConflicts"
                  class="px-6 py-2.5 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50">
            {{ processing ? $t('batchRename.processing') : $t('rename.confirm') }}
          </button>
        </div>
      </div>

      <!-- 步骤 3: 完成结果 -->
      <div v-if="step === 'done' && results.length > 0" class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('rename.doneTitle', { count: results.length }) }}</h3>
        <div class="space-y-1 max-h-64 overflow-y-auto">
          <div v-for="(r, i) in results" :key="i" class="text-xs text-text-muted truncate">
            <span class="text-text-secondary">{{ r.oldPath.split('/').pop() }}</span>
            <span class="text-accent mx-2">→</span>
            <span>{{ r.newPath.split('/').pop() }}</span>
          </div>
        </div>
        <button @click="step = 'edit'; results = []"
                class="mt-3 px-4 py-1.5 text-xs rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-hover transition-colors">
          {{ $t('rename.continueRename') }}
        </button>
      </div>
    </div>
  </div>
</template>
