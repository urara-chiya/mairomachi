<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import type {
  ArenaPlayerStatItem,
  BattleRecord,
  RecordClanInfoResponse,
  RecordPlayerInfo,
  ShipInfoDetail,
  ShipLanguageKey
} from '@shared/types'
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
const enrichedPlayers = ref<
  Record<
    number,
    {
      pr?: ArenaPlayerStatItem
      dmg?: ArenaPlayerStatItem
      fragsLevel?: ArenaPlayerStatItem
      xpLevel?: ArenaPlayerStatItem
    }
  >
>({})
const clanInfoMap = ref<Record<number, RecordClanInfoResponse>>({})
const loading = ref(false)

watch(
  () => props.record,
  async (record) => {
    if (!record) {
      shipInfoMap.value = {}
      enrichedPlayers.value = {}
      clanInfoMap.value = {}
      return
    }
    loading.value = true
    try {
      const shipIds = record.players.map((p) => p.shipId)
      const accountIds = record.players.map((p) => p.accountId)
      const [shipMap, detailPlayers, clanInfos] = await Promise.all([
        window.ipc.ship.getByIds(shipIds),
        window.ipc.record.getDetail({
          matchResult: JSON.parse(JSON.stringify(record.matchResult)),
          players: JSON.parse(JSON.stringify(record.players))
        }),
        window.ipc.record.getClanInfo({
          accountIds,
          realm: record.realm
        })
      ])
      shipInfoMap.value = shipMap
      enrichedPlayers.value = detailPlayers.reduce(
        (acc, p) => {
          acc[p.accountId] = {
            pr: p.pr,
            dmg: p.dmg,
            fragsLevel: p.fragsLevel,
            xpLevel: p.xpLevel
          }
          return acc
        },
        {} as typeof enrichedPlayers.value
      )
      clanInfoMap.value = clanInfos.reduce(
        (acc, c) => {
          acc[c.accountId] = c
          return acc
        },
        {} as Record<number, RecordClanInfoResponse>
      )
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
  pr: enrichedPlayers.value[player.accountId]?.pr,
  dmg: enrichedPlayers.value[player.accountId]?.dmg,
  fragsLevel: enrichedPlayers.value[player.accountId]?.fragsLevel,
  xpLevel: enrichedPlayers.value[player.accountId]?.xpLevel,
  shipInfo: shipInfoMap.value[player.shipId.toString()],
  clanId: clanInfoMap.value[player.accountId]?.clanId,
  clanName: clanInfoMap.value[player.accountId]?.clanName,
  clanTag: clanInfoMap.value[player.accountId]?.clanTag,
  clanTagColor: clanInfoMap.value[player.accountId]?.clanTagColor
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
</script>

<template>
  <n-spin :show="loading" description="正在计算对局数据...">
    <n-flex :size="0" class="team-list-area">
      <n-card :bordered="false" class="team-list-card" embedded size="small">
        <record-player-card
          v-for="(p, i) in allies"
          :key="p.accountId"
          :direction="allyUi"
          :hide-player-name="hidePlayerId"
          :language="language"
          :player="p"
          :player-index="i + 1" />
      </n-card>
      <n-card v-show="enemies.length > 0" :bordered="false" class="team-list-card" embedded size="small">
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

.team-list-card :deep(.n-card-content) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
