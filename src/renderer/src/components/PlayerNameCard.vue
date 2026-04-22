<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
  reverse: boolean
  clanTag?: string
  clanTagColor?: string
  name: string
  playerIndex?: number
  hidePlayerName?: boolean
}>()

const displayName = computed(() => {
  if (props.hidePlayerName && props.playerIndex !== undefined) {
    return `Player-${String(props.playerIndex).padStart(2, '0')}`
  }
  return props.name
})

const showClanTag = computed(() => {
  if (props.hidePlayerName) return false
  return !!props.clanTag
})

const color = computed(() => ({
  textColor: props.clanTagColor,
  color: props.clanTagColor + '20'
}))
</script>

<template>
  <n-space :reverse="reverse">
    <n-tag v-if="showClanTag" :bordered="false" :color="color" size="small"> [{{ clanTag }}] </n-tag>
    <n-ellipsis
      :style="{
        fontWeight: 500,
        fontSize: '16px'
      }"
      >{{ displayName }}
    </n-ellipsis>
  </n-space>
</template>

<style scoped></style>
