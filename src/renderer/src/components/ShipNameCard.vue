<script lang="ts" setup>
import { computed } from 'vue'
import { ROMA, SIMPLE_TYPE } from '@shared/constants/ships'

const props = defineProps<{
  reverse: boolean
  tier: string
  type: string
  name: string
}>()

const formattedTier = computed(() => ROMA[props.tier] ?? '??')

const formattedType = computed(() => SIMPLE_TYPE[props.type] ?? { tag: '??', color: 'default' })
</script>

<template>
  <n-tag :type="formattedType.color" class="ship-tier-tag" size="small">
    <n-space :reverse="reverse" size="small">
      <span>{{ formattedTier }} </span>
      <span>{{ name }}</span>
    </n-space>
  </n-tag>
</template>

<style scoped></style>
