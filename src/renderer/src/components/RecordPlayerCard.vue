<script lang="ts" setup>
import type { RecordPlayerInfo, ShipLanguageKey } from '@shared/types'
import { computed } from 'vue'
import PlayerCardWrapper from '@renderer/components/PlayerCardWrapper.vue'
import PlayerNameCard from '@renderer/components/PlayerNameCard.vue'
import ShipNameCard from '@renderer/components/ShipNameCard.vue'
import { getShipName } from '@renderer/utils/ship'
import { formatInteger } from '@renderer/utils/format'

const props = defineProps<{
  player: RecordPlayerInfo
  language: ShipLanguageKey
  direction?: 'ltr' | 'rtl'
  playerIndex?: number
  hidePlayerName?: boolean
}>()

const reverse = computed(() => props.direction === 'rtl')

const shipName = computed(() => getShipName(props.player.shipInfo, props.language))
const shipType = computed(() => props.player.shipInfo?.type ?? 'Unknown')
const shipTier = computed(() => props.player.shipInfo?.tier ?? '-1')
</script>

<template>
  <player-card-wrapper :pr="player.pr" class="record-player-card">
    <n-flex :size="4" class="player-info-wrapper" justify="center" vertical>
      <n-flex :reverse="reverse" align="center" justify="space-between">
        <player-name-card
          :clan-tag="player.clanTag"
          :clan-tag-color="player.clanTagColor"
          :name="player.name"
          :reverse="reverse"
          :player-index="playerIndex"
          :hide-player-name="hidePlayerName" />
        <ship-name-card :name="shipName" :reverse="!reverse" :tier="shipTier" :type="shipType" />
      </n-flex>
      <n-flex :reverse="reverse" align="center" justify="space-between">
        <n-space :reverse="reverse" size="small">
          <n-statistic class="record-player-stat" label="伤害">
            <n-text :style="{ color: player.dmg?.color || '#888888' }">
              {{ formatInteger(player.damage) }}
            </n-text>
          </n-statistic>
          <n-statistic class="record-player-stat" label="击杀">
            <n-text :style="{ color: player.fragsLevel?.color || '#888888' }">
              {{ player.frags }}
            </n-text>
          </n-statistic>
        </n-space>
        <n-space :reverse="reverse" size="small">
          <n-statistic class="record-player-stat" label="PR">
            <n-text :style="{ color: player.pr?.color || '#888888' }">
              {{ formatInteger(player.pr?.value ?? 0) }}
            </n-text>
          </n-statistic>
          <n-statistic class="record-player-stat" label="经验">
            <n-text :style="{ color: player.xpLevel?.color || '#888888' }">
              {{ formatInteger(player.exp) }}
            </n-text>
          </n-statistic>
          <n-tag v-if="props.player.isBot" size="tiny" type="warning">Bot</n-tag>
        </n-space>
      </n-flex>
    </n-flex>
  </player-card-wrapper>
</template>

<style scoped>
:deep(.record-player-card) {
  min-width: 260px;
}

.player-info-wrapper {
  width: 100%;
  height: 100%;
}

.record-player-stat {
  width: 48px;
}

.record-player-stat :deep(.n-statistic__label) {
  text-align: center;
  font-size: 10px;
  height: 12px;
  line-height: 12px;
}

.record-player-stat :deep(.n-statistic-value) {
  margin-top: 0;
  height: 16px;
  line-height: 16px;
  text-align: center;
}

.record-player-stat :deep(.n-statistic-value__content) {
  font-size: 11px;
  font-weight: 600;
  height: 16px;
  line-height: 16px;
}
</style>
