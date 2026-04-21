<script lang="ts" setup>
import ExternalLink from '@renderer/components/ExternalLink.vue'

withDefaults(
  defineProps<{
    mode?: 'modal' | 'inline'
    show?: boolean
  }>(),
  {
    mode: 'inline',
    show: false
  }
)

const emits = defineEmits<{
  'update:show': [boolean]
  acknowledge: []
  exit: []
}>()

const handleAcknowledge = (): void => {
  emits('update:show', false)
  emits('acknowledge')
}

const handleExit = (): void => {
  emits('exit')
}
</script>

<template>
  <template v-if="mode === 'modal'">
    <n-modal
      :closable="false"
      :mask-closable="false"
      :show="show"
      @update:show="(v: boolean) => emits('update:show', v)">
      <n-card style="width: 720px; max-width: 90vw" title="作者声明">
        <n-flex :size="16" class="content-panel" vertical>
          <n-p style="font-size: 13px; line-height: 1.8">
            迷路町（mairomachi）是一款技术参考现有主流开源《战舰世界》对局查询工具而开发的桌面端数据查询应用。
            数据来源为
            <external-link url="https://wows-numbers.com/"> wows-numbers </external-link>
            及
            <external-link url="https://developers.wargaming.net/"> Wargaming 官方公开接口 </external-link>
            。
          </n-p>
          <n-p style="line-height: 1.8">
            本应用仅作为查询工具使用，旨在帮助玩家更直观地理解对局数据，<n-text strong
              >不包含任何作者主观引导行为</n-text
            >。应用内所有用于计算评分、胜率、PR的数据均来源于第三方公开接口。服务端计算结果仅供参考，不代表任何官方观点或立场。
          </n-p>
          <n-p depth="3" style="font-size: 13px; line-height: 1.8">
            目前应用处于
            <n-text type="warning">内测阶段</n-text>，如需获取邀请码，请于游戏中联系作者：
            <n-text code>ASIA [RSTC] Urara_Chiya_Poi</n-text>
          </n-p>
        </n-flex>
        <template #footer>
          <n-flex :size="12" justify="end">
            <n-button @click="handleExit">退出</n-button>
            <n-button type="primary" @click="handleAcknowledge">我已知晓</n-button>
          </n-flex>
        </template>
      </n-card>
    </n-modal>
  </template>

  <template v-else>
    <n-flex :size="16" class="content-panel" vertical>
      <n-h1>作者声明</n-h1>
      <n-p style="line-height: 1.8">
        迷路町（mairomachi）是一款技术参考现有主流开源《战舰世界》对局查询工具而开发的桌面端数据查询应用。 数据来源为
        <external-link url="https://wows-numbers.com/">wows-numbers</external-link>
        及
        <external-link url="https://developers.wargaming.net/"> Wargaming 官方公开接口 </external-link>
        。
      </n-p>
      <n-p style="line-height: 1.8">
        本应用仅作为查询工具使用，旨在帮助玩家更直观地理解对局数据，<n-text strong>不包含任何作者主观引导行为</n-text
        >。应用内所有用于计算评分、胜率、PR的数据均来源于第三方公开接口。服务端计算结果仅供参考，不代表任何官方观点或立场。
      </n-p>
      <n-p style="line-height: 1.8">
        目前应用处于
        <n-text type="warning">内测阶段</n-text>，如需获取邀请码或有任何问题反馈，请于游戏中联系作者：
        <n-text code>ASIA [RSTC] Urara_Chiya_Poi</n-text>
      </n-p>
      <n-divider />
      <n-p depth="3" style="font-size: 12px"> 作者：Urara_Chiya_Poi · 公会：[RSTC] </n-p>
    </n-flex>
  </template>
</template>

<style scoped>
.content-panel {
  padding: 8px;
}
</style>
