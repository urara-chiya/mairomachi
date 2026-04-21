<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
  reverse: boolean
  clanTag?: string
  clanTagColor?: string
  name: string
}>()

const color = computed(() => ({
  textColor: props.clanTagColor,
  color: props.clanTagColor + '20'
}))
</script>

<template>
  <n-space :reverse="reverse">
    <n-tag v-if="clanTag" :bordered="false" :color="color" size="small"> [{{ clanTag }}] </n-tag>
    <n-ellipsis
      :style="{
        fontWeight: 500,
        fontSize: '16px'
      }"
      >{{ name }}
    </n-ellipsis>
  </n-space>
</template>

<style scoped></style>
