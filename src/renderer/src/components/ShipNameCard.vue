<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ROMA, SHIP_TYPE_FILL_COLOR } from '@shared/constants/ships'
import { tintContourImage } from '@renderer/utils/image'

const props = defineProps<{
  reverse: boolean
  tier: string
  type: string
  name: string
  isAlly?: boolean
  mode?: 'standard' | 'contour'
  contourImage?: string
}>()

const emit = defineEmits<{
  ready: []
}>()

const mode = computed(() => props.mode ?? 'standard')
const isAlly = computed(() => props.isAlly ?? true)
const formattedTier = computed(() => ROMA[props.tier] ?? '??')

// ------------------------------------------------------------------------------
// 舰种 icon 缓存（模块级全局缓存，避免重复 IPC）
// ------------------------------------------------------------------------------

const iconCache = new Map<string, string | null>()
const iconPath = ref<string | null>(null)

async function loadIcon(): Promise<void> {
  if (!props.type || props.type === 'Unknown') return
  if (iconCache.has(props.type)) {
    iconPath.value = iconCache.get(props.type) ?? null
    return
  }
  try {
    const path = await window.ipc.ship.getTypeIcon(props.type)
    iconCache.set(props.type, path)
    iconPath.value = path
  } catch {
    iconCache.set(props.type, null)
    iconPath.value = null
  }
}

const processedContourImage = ref<string | null>(null)

const shipTypeColor = computed(() => SHIP_TYPE_FILL_COLOR[props.type] ?? '#B2B2B2')

async function processContourImage(url: string | undefined): Promise<void> {
  if (!url) {
    processedContourImage.value = null
    emit('ready')
    return
  }
  try {
    processedContourImage.value = await tintContourImage(url, shipTypeColor.value)
  } catch {
    processedContourImage.value = null
  } finally {
    emit('ready')
  }
}

watch(
  () => props.contourImage,
  (url) => processContourImage(url),
  { immediate: true }
)

watch(
  () => props.type,
  () => loadIcon(),
  { immediate: true }
)

onMounted(() => {
  loadIcon()
})

const tagType = computed(() => (isAlly.value ? 'success' : 'error'))

const reverseClass = computed(() => (props.reverse ? 'reverse' : ''))
</script>

<template>
  <!-- 标准模式 -->
  <n-tag v-if="mode === 'standard'" :type="tagType" class="ship-tier-tag" size="small">
    <n-flex :reverse="reverse" align="center" :size="4">
      <img
        v-if="iconPath"
        :class="reverseClass"
        :src="iconPath"
        alt=""
        class="ship-type-icon"
        style="height: 24px; width: auto; object-fit: contain" />
      <span>{{ formattedTier }}</span>
      <span>{{ name }}</span>
    </n-flex>
  </n-tag>

  <!-- 轮廓图模式 -->
  <n-card v-else class="ship-contour-card" :content-style="{ padding: '0' }" embedded :bordered="false" size="small">
    <n-flex align="center" justify="center" vertical :size="0">
      <img
        v-if="processedContourImage"
        :class="reverseClass"
        :src="processedContourImage"
        alt=""
        class="ship-contour-image"
        style="height: 20px; width: auto; object-fit: contain; display: block" />
      <n-flex :reverse="reverse" align="center" :size="4">
        <img
          v-if="iconPath"
          :class="reverseClass"
          :src="iconPath"
          alt=""
          class="ship-type-icon"
          style="height: 24px; width: auto; object-fit: contain" />
        <span class="contour-tier">{{ formattedTier }}</span>
        <span class="contour-name">{{ name }}</span>
      </n-flex>
    </n-flex>
  </n-card>
</template>

<style scoped>
.ship-tier-tag {
  font-size: 12px;
}

.ship-type-icon.reverse {
  transform: scaleX(-1);
}

.ship-contour-image.reverse {
  transform: scaleX(-1);
}

.contour-tier,
.contour-name {
  font-size: 13px;
  line-height: 1.1;
}
</style>
