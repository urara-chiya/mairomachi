<script lang="ts" setup>
import type { BattleRecord, BattleRecordPlayer, ShipInfoDetail, ShipLanguageKey } from '@shared/types'
import { computed } from 'vue'
import { CloseOutlined } from '@vicons/antd'
import PlayerCardWrapper from '@renderer/components/PlayerCardWrapper.vue'
import ArenaPlayerStat from '@renderer/components/ArenaPlayerStat.vue'
import ShipNameCard from '@renderer/components/ShipNameCard.vue'
import { getShipName } from '@renderer/utils/ship'
import { formatDate, formatInteger, getResultTagType, getResultText } from '@renderer/utils/format'

const props = defineProps<{
  record: BattleRecord
  player?: BattleRecordPlayer
  shipInfo?: ShipInfoDetail
  language?: ShipLanguageKey
}>()

const emit = defineEmits<{
  click: [record: BattleRecord]
  delete: [id: string]
}>()

const handleClick = (): void => {
  emit('click', props.record)
}

const shipName = computed(() => getShipName(props.shipInfo, props.language || 'zh-cn'))

const damageItem = computed(() => {
  if (!props.player) return undefined
  return {
    value: props.player.damage,
    color: props.player.dmg?.color ?? '#888888',
    tag: ''
  }
})

const fragsItem = computed(() => {
  if (!props.player) return undefined
  return {
    value: props.player.frags,
    color: props.player.fragsLevel?.color ?? '#888888',
    tag: ''
  }
})

const expItem = computed(() => {
  if (!props.player) return undefined
  return {
    value: props.player.exp,
    color: props.player.xpLevel?.color ?? '#888888',
    tag: ''
  }
})

const handleDelete = (e: MouseEvent): void => {
  e.stopPropagation()
  emit('delete', props.record.id)
}
</script>

<template>
  <player-card-wrapper :pr="player?.pr" class="record-card" @click="handleClick">
    <n-flex :size="4" class="record-card-content" justify="center" vertical>
      <n-flex align="center" justify="space-between">
        <n-flex :size="8" align="center">
          <n-tag :type="getResultTagType(record.matchResult?.result)" size="small">
            {{ getResultText(record.matchResult?.result) }}
          </n-tag>
          <ship-name-card
            v-if="shipInfo"
            :name="shipName"
            :reverse="false"
            :tier="shipInfo.tier"
            :type="shipInfo.type" />
          <n-text strong style="font-size: 16px">{{ record.mapName }}</n-text>
        </n-flex>
        <n-flex align="center">
          <n-text depth="3" style="font-size: 12px">{{ record.gameMode }} · {{ record.matchGroup }}</n-text>
          <n-text depth="3" style="font-size: 12px">{{ formatDate(record.dateTime) }}</n-text>
          <n-button secondary size="tiny" type="tertiary" @click="handleDelete">
            <template #icon>
              <close-outlined />
            </template>
          </n-button>
        </n-flex>
      </n-flex>
      <n-space size="small">
        <arena-player-stat :format="formatInteger" :stat="damageItem" label="伤害" />
        <arena-player-stat :stat="fragsItem" label="击杀" />
        <arena-player-stat :stat="expItem" label="经验" />
        <arena-player-stat :format="formatInteger" :stat="player?.pr" label="PR" />
      </n-space>
    </n-flex>
  </player-card-wrapper>
</template>

<style scoped>
.record-card {
  height: 80px;
  min-height: 80px;
  max-height: 80px;
  min-width: 520px;
  cursor: pointer;
}

.record-card-content {
  width: 100%;
  height: 100%;
}
</style>
