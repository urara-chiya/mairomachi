<script lang="ts" setup>
/* global __APP_VERSION__ */
const appVersion = __APP_VERSION__
</script>

<template>
  <n-flex :size="4" align="center" class="app-footer" justify="center">
    <n-text depth="3" style="font-size: 12px"> Mairomachi-v{{ appVersion }}@[RSTC]Urara_Chiya_Poi </n-text>
  </n-flex>
</template>

<style scoped>
.app-footer {
  height: 24px;
}
</style>
