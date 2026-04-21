<script lang="ts" setup>
import type { ArenaPlayerInfo, ShipInfoDetail, ShipLanguageKey } from '@shared/types'
import ArenaPlayerStat from '@renderer/components/ArenaPlayerStat.vue'
import { computed } from 'vue'
import PlayerNameCard from '@renderer/components/PlayerNameCard.vue'
import ShipNameCard from '@renderer/components/ShipNameCard.vue'
import { getShipName } from '@renderer/utils/ship'
import { formatInteger, formatWinRate } from '@renderer/utils/format'
import PlayerCardWrapper from '@renderer/components/PlayerCardWrapper.vue'

const props = defineProps<{
  info: ArenaPlayerInfo
  shipInfo: ShipInfoDetail | undefined
  language: ShipLanguageKey
  direction: 'ltr' | 'rtl'
}>()

const reverse = computed(() => props.direction === 'rtl')

const shipName = computed(() => getShipName(props.shipInfo, props.language))
const shipType = computed(() => props.shipInfo?.type ?? 'Unknown')
const shipTier = computed(() => props.shipInfo?.tier ?? '-1')
</script>

<template>
  <player-card-wrapper :pr="info.ship?.pr" class="arena-player-card">
    <n-flex :size="4" class="player-info-wrapper" justify="center" vertical>
      <n-flex :reverse="reverse" align="center" justify="space-between">
        <player-name-card
          :clan-tag="info.clanTag"
          :clan-tag-color="info.clanTagColor"
          :name="info.playerName"
          :reverse="reverse" />
        <ship-name-card :name="shipName" :reverse="!reverse" :tier="shipTier" :type="shipType" />
      </n-flex>
      <n-flex :reverse="reverse" align="center" justify="space-between">
        <n-space :reverse="reverse" size="small">
          <arena-player-stat :format="formatInteger" :stat="props.info.total?.battles" label="场次" />
          <arena-player-stat :format="formatWinRate" :stat="props.info.total?.winRates" label="胜率" />
          <arena-player-stat :format="formatInteger" :stat="props.info.total?.rapidPr" label="RPR" />
          <arena-player-stat :format="formatInteger" :stat="props.info.totalAtTierType?.rapidPr" label="TT-RPR" />
        </n-space>
        <n-space :reverse="reverse" size="small">
          <arena-player-stat :format="formatInteger" :stat="props.info.ship?.battles" label="场次" />
          <arena-player-stat :format="formatWinRate" :stat="props.info.ship?.winRates" label="胜率" />
          <arena-player-stat :format="formatInteger" :stat="props.info.ship?.avgDmg" label="场均" />
          <arena-player-stat :format="formatInteger" :stat="props.info.shipAtTierType?.rapidPr" label="TT-RPR" />
          <arena-player-stat :format="formatInteger" :stat="props.info.ship?.pr" label="PR" />
        </n-space>
      </n-flex>
    </n-flex>
  </player-card-wrapper>
</template>

<style scoped>
:deep(.arena-player-card) {
  min-width: 360px;
}

.player-info-wrapper {
  width: 100%;
  height: 100%;
}
</style>
