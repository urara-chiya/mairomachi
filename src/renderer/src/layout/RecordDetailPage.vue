<script lang="ts" setup>
import { computed, CSSProperties, ref, watch } from 'vue'
import type { BattleRecord, RecordPlayerInfo, ShipInfoDetail, ShipLanguageKey } from '@shared/types'
import RecordPlayerCard from '@renderer/components/RecordPlayerCard.vue'
import { useMessage } from 'naive-ui'

const props = defineProps<{
  record: BattleRecord | null
  language: ShipLanguageKey
  allyUi: 'ltr' | 'rtl'
  enemyUi: 'ltr' | 'rtl'
  hidePlayerId?: boolean
}>()

defineEmits<{
  close: []
}>()

const message = useMessage()

const shipInfoMap = ref<Record<string, ShipInfoDetail>>({})
const loading = ref(false)

watch(
  () => props.record,
  async (record) => {
    if (!record) {
      shipInfoMap.value = {}
      return
    }
    loading.value = true
    try {
      const shipIds = record.players.map((p) => p.shipId)
      shipInfoMap.value = await window.ipc.ship.getByIds(shipIds)
    } catch {
      message.error('对局详情加载失败了>_<')
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

const assemblePlayer = (player: BattleRecord['players'][number]): RecordPlayerInfo => ({
  ...player,
  shipInfo: shipInfoMap.value[player.shipId.toString()]
})

const sortByExpDesc = (a: RecordPlayerInfo, b: RecordPlayerInfo): number => b.exp - a.exp

const allies = computed(
  () =>
    props.record?.players
      .filter((p) => p.relation === 'Ally' || p.relation === 'Self')
      .map(assemblePlayer)
      .sort(sortByExpDesc) ?? []
)
const enemies = computed(
  () =>
    props.record?.players
      .filter((p) => p.relation === 'Enemy')
      .map(assemblePlayer)
      .sort(sortByExpDesc) ?? []
)

const teamListContentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
}
</script>

<template>
  <n-spin :show="loading" description="正在计算对局数据...">
    <n-flex :size="0" class="team-list-area">
      <n-card class="team-list-card" :content-style="teamListContentStyle" embedded size="small" :bordered="false">
        <record-player-card
          v-for="(p, i) in allies"
          :key="p.accountId"
          :direction="allyUi"
          :hide-player-name="hidePlayerId"
          :language="language"
          :player="p"
          :player-index="i + 1" />
      </n-card>
      <n-card class="team-list-card" :content-style="teamListContentStyle" embedded size="small" :bordered="false">
        <record-player-card
          v-for="(p, i) in enemies"
          :key="p.accountId"
          :direction="enemyUi"
          :hide-player-name="hidePlayerId"
          :language="language"
          :player="p"
          :player-index="i + 1" />
      </n-card>
    </n-flex>
  </n-spin>
</template>

<style scoped>
.team-list-area {
  flex: 1;
}

.team-list-card {
  height: 100%;
  flex: 1;
}
</style>
