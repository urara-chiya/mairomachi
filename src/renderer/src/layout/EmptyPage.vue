<script lang="ts" setup>
import type { PageChannelEmits } from '@renderer/composables/usePageChannel'

const emit = defineEmits<PageChannelEmits>()
</script>

<template>
  <n-flex align="center" class="empty-page" justify="center">
    <n-empty description="这里什么也没有。。。" size="large">
      <template #extra>
        <n-button size="large" @click="emit('channel', { type: 'navigate', payload: 'dashboard' })">
          回到主页
        </n-button>
      </template>
    </n-empty>
  </n-flex>
</template>

<style scoped>
.empty-page {
  width: 100%;
  height: 100%;
}
</style>
