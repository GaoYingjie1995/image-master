<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  editId?: number | null
  editName?: string
  editRules?: string
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'create', name: string, rules: string): void
  (e: 'save', id: number, name: string, rules: string): void
}>()

const name = ref('')
const operator = ref<'AND' | 'OR'>('AND')
const conditions = ref<Array<{ field: string; op: string; value: string }>>([
  { field: 'rating', op: 'gte', value: '4' }
])

const isEditMode = ref(false)

// 编辑模式：加载已有规则
watch(() => props.visible, (visible) => {
  if (visible && props.editId && props.editRules) {
    isEditMode.value = true
    name.value = props.editName || ''
    try {
      const parsed = JSON.parse(props.editRules)
      operator.value = parsed.operator || 'AND'
      conditions.value = (parsed.conditions || []).map((c: { field: string; op: string; value: unknown }) => ({
        field: c.field,
        op: c.op,
        value: Array.isArray(c.value) ? c.value.join(', ') : String(c.value ?? '')
      }))
    } catch {
      conditions.value = [{ field: 'rating', op: 'gte', value: '4' }]
    }
  } else if (visible) {
    isEditMode.value = false
    name.value = ''
    operator.value = 'AND'
    conditions.value = [{ field: 'rating', op: 'gte', value: '4' }]
  }
})

const fields = [
  { value: 'camera_model', label: t('smartAlbum.fields.cameraModel') },
  { value: 'lens_model', label: t('smartAlbum.fields.lensModel') },
  { value: 'rating', label: t('smartAlbum.fields.rating') },
  { value: 'color_label', label: t('smartAlbum.fields.colorLabel') },
  { value: 'is_rejected', label: t('smartAlbum.fields.isRejected') },
  { value: 'format', label: t('smartAlbum.fields.format') },
  { value: 'iso', label: 'ISO' },
  { value: 'aperture', label: t('smartAlbum.fields.aperture') },
  { value: 'shot_at', label: t('smartAlbum.fields.shotAt') }
]

const ops = [
  { value: 'equals', label: t('smartAlbum.ops.equals') },
  { value: 'not_equals', label: t('smartAlbum.ops.notEquals') },
  { value: 'gte', label: t('smartAlbum.ops.gte') },
  { value: 'lte', label: t('smartAlbum.ops.lte') },
  { value: 'contains', label: t('smartAlbum.ops.contains') },
  { value: 'in', label: t('smartAlbum.ops.in') },
  { value: 'this_month', label: t('smartAlbum.ops.thisMonth') },
  { value: 'this_year', label: t('smartAlbum.ops.thisYear') }
]

function addCondition() {
  conditions.value.push({ field: 'camera_model', op: 'equals', value: '' })
}

function removeCondition(index: number) {
  conditions.value.splice(index, 1)
}

function buildRules(): string {
  return JSON.stringify({
    operator: operator.value,
    conditions: conditions.value.map(c => {
      let value: unknown = c.value
      if (c.op === 'in') {
        // in 操作符：逗号分隔的值转为数组
        value = c.value.split(',').map(v => v.trim()).filter(Boolean)
        // 尝试转为数字数组（适用于数值字段）
        if (['rating', 'iso', 'aperture'].includes(c.field)) {
          value = (value as string[]).map(v => Number(v))
        }
      } else if (['is_rejected'].includes(c.field)) {
        value = c.value === 'true'
      } else if (['rating', 'iso', 'aperture'].includes(c.field)) {
        value = Number(c.value)
      }
      return { field: c.field, op: c.op, value }
    })
  })
}

function handleSave() {
  if (!name.value.trim()) return

  const rules = buildRules()

  if (isEditMode.value && props.editId) {
    emit('save', props.editId, name.value.trim(), rules)
  } else {
    emit('create', name.value.trim(), rules)
  }
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
           @click.self="emit('close')">
        <div class="bg-bg-secondary rounded-xl border border-white/5 p-6 w-[480px] max-h-[80vh] overflow-y-auto">
          <h3 class="font-display text-lg text-accent mb-4">
            {{ isEditMode ? $t('smartAlbum.editTitle') : $t('smartAlbum.createTitle') }}
          </h3>

          <div class="space-y-4">
            <div>
              <label class="text-xs text-text-secondary block mb-1">{{ $t('smartAlbum.albumName') }}</label>
              <input v-model="name" :placeholder="$t('smartAlbum.namePlaceholder')"
                     class="w-full bg-bg-tertiary border border-white/5 rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/30" />
            </div>

            <div>
              <label class="text-xs text-text-secondary block mb-1">{{ $t('smartAlbum.conditionLogic') }}</label>
              <div class="flex gap-2">
                <button @click="operator = 'AND'"
                        class="px-3 py-1 text-xs rounded-md transition-colors"
                        :class="operator === 'AND' ? 'bg-accent-dim text-accent' : 'bg-bg-tertiary text-text-secondary'">
                  {{ $t('smartAlbum.matchAll') }} (AND)
                </button>
                <button @click="operator = 'OR'"
                        class="px-3 py-1 text-xs rounded-md transition-colors"
                        :class="operator === 'OR' ? 'bg-accent-dim text-accent' : 'bg-bg-tertiary text-text-secondary'">
                  {{ $t('smartAlbum.matchAny') }} (OR)
                </button>
              </div>
            </div>

            <div>
              <label class="text-xs text-text-secondary block mb-2">{{ $t('smartAlbum.conditions') }}</label>
              <div class="space-y-2">
                <div v-for="(cond, i) in conditions" :key="i" class="flex gap-2 items-center">
                  <select v-model="cond.field"
                          class="bg-bg-tertiary border border-white/5 rounded px-2 py-1.5 text-xs text-text-primary outline-none">
                    <option v-for="f in fields" :key="f.value" :value="f.value">{{ f.label }}</option>
                  </select>
                  <select v-model="cond.op"
                          class="bg-bg-tertiary border border-white/5 rounded px-2 py-1.5 text-xs text-text-primary outline-none">
                    <option v-for="o in ops" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                  <input v-if="!['this_month', 'this_year'].includes(cond.op)"
                         v-model="cond.value"
                         :placeholder="cond.op === 'in' ? $t('smartAlbum.inPlaceholder') : $t('smartAlbum.valuePlaceholder')"
                         class="flex-1 bg-bg-tertiary border border-white/5 rounded px-2 py-1.5 text-xs text-text-primary outline-none" />
                  <button @click="removeCondition(i)"
                          class="w-6 h-6 flex items-center justify-center text-text-muted hover:text-red-400 text-xs">✕</button>
                </div>
              </div>
              <button @click="addCondition"
                      class="mt-2 text-xs text-text-muted hover:text-accent transition-colors">
                + {{ $t('smartAlbum.addCondition') }}
              </button>
            </div>
          </div>

          <div class="flex gap-2 justify-end mt-6">
            <button @click="emit('close')"
                    class="px-4 py-1.5 text-sm rounded-lg text-text-secondary hover:bg-bg-hover transition-colors">
              {{ $t('album.cancel') }}
            </button>
            <button @click="handleSave"
                    class="px-4 py-1.5 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
              {{ isEditMode ? $t('smartAlbum.save') : $t('smartAlbum.create') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
