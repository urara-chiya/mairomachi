<script lang="ts" setup>
const props = defineProps<{
  url: string
}>()

const handleClick = (e: MouseEvent): void => {
  e.preventDefault()
  window.ipc.explorer.openExternal(props.url).then()
}
</script>

<template>
  <n-a href="javascript:void(0)" @click="handleClick">
    <slot />
  </n-a>
</template>
