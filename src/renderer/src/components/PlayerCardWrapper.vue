<script lang="ts" setup>
import type { ArenaPlayerStatItem } from '@shared/types'
import { computed, CSSProperties, ref } from 'vue'

const props = defineProps<{
  pr?: ArenaPlayerStatItem
}>()

const isHovered = ref(false)

function hexToRgba(hex: string, alpha: number): string {
  const sanitized = hex.replace('#', '')
  const bigint = parseInt(sanitized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const cardStyle = computed(() => {
  if (!props.pr) {
    return {
      borderRadius: '8px',
      transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
    }
  }

  const color = props.pr.color || '#888888'
  const value = props.pr.value ?? 0
  const opacity = 0.15 + (Math.abs(value - 1500) / 1500) * 0.45
  const rgba = hexToRgba(color, opacity)
  const insetRgba = hexToRgba(color, opacity * 0.5)
  const borderRgba = hexToRgba(color, opacity * 0.6)

  if (isHovered.value) {
    return {
      boxShadow: `0 3px 14px 2px ${hexToRgba(color, Math.min(1, opacity * 1.3))}, inset 0 0 8px 2px ${hexToRgba(color, Math.min(1, opacity * 0.7))}`,
      border: `1px solid ${hexToRgba(color, Math.min(1, opacity * 0.9))}`,
      borderRadius: '8px',
      transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
    }
  }

  return {
    boxShadow: `0 1px 8px 1px ${rgba}, inset 0 0 6px 1px ${insetRgba}`,
    border: `1px solid ${borderRgba}`,
    borderRadius: '8px',
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
  }
})

const cardContentStyle: CSSProperties = {
  padding: '4px 12px'
}
</script>

<template>
  <n-card
    :style="cardStyle"
    class="player-card-wrapper"
    :content-style="cardContentStyle"
    size="small"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false">
    <slot />
  </n-card>
</template>

<style scoped>
.player-card-wrapper {
  border-radius: 8px;
  overflow: hidden;
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  will-change: box-shadow, border-color;
  cursor: default;
}

.player-card-wrapper:hover {
  cursor: pointer;
}
</style>
