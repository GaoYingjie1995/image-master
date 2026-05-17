<script setup lang="ts">
const props = defineProps<{ rating: number; size?: 'sm' | 'md' }>()
const emit = defineEmits<{ (e: 'rate', value: number): void }>()

const stars = [1, 2, 3, 4, 5]
</script>

<template>
  <div class="flex gap-0.5" role="radiogroup" aria-label="评分">
    <button v-for="star in stars" :key="star"
            @click.stop="emit('rate', star)"
            class="transition-colors"
            :class="[
              star <= rating ? 'text-accent' : 'text-text-muted/30',
              size === 'sm' ? 'text-[10px]' : 'text-base'
            ]"
            role="radio"
            :aria-checked="star === rating"
            :aria-label="star + '星'">
      ★
    </button>
  </div>
</template>
