<script lang="ts" setup>
/* global __APP_VERSION__ */
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { FormItemRule, MenuOption, SelectOption, useMessage } from 'naive-ui'
import type { AppConfigs } from '@shared/types'
import { CloseOutlined } from '@vicons/antd'
import { useAsync } from '@renderer/composables/useAsync'
import { useSwitch } from '@renderer/composables/useSwitch'

const message = useMessage()
const emits = defineEmits<{
  close: []
}>()

const menuItems = reactive<MenuOption[]>([
  {
    key: 'system',
    label: '系统设置'
  },
  {
    key: 'arena-monitor',
    label: '对局监控'
  },
  {
    key: 'record',
    label: '对局记录'
  },
  {
    key: 'update',
    label: '检查更新'
  }
])
const activateMenuKey = ref<string | null>('system')

const settingsForm = reactive<AppConfigs['app']>({
  ui: {
    theme: 'dark',
    allyUI: 'ltr',
    enemyUI: 'rtl',
    shipNameLanguage: 'zh-cn'
  },
  arenaMonitor: {
    gamePath: '',
    enableAutoMonitor: false,
    realm: 'ASIA'
  },
  record: {
    enableAutoRecord: false,
    cacheDays: 7
  }
})

function enumRule(values: string[], msg: string): FormItemRule {
  return {
    validator: (_, value) => (values.includes(value) ? Promise.resolve() : Promise.reject(new Error(msg))),
    trigger: 'change'
  }
}

const uiRules: Record<keyof AppConfigs['ui'], FormItemRule> = {
  theme: enumRule(['light', 'dark'], '主题不能这样配置>_<'),
  allyUI: enumRule(['ltr', 'rtl'], 'UI方向不能这样配置>_<'),
  enemyUI: enumRule(['ltr', 'rtl'], 'UI方向不能这样配置>_<'),
  shipNameLanguage: enumRule(['zh-cn', 'zh-tw', 'en', 'ja'], '舰船名称语言配置不正确>_<')
}

const arenaMonitorRules: Record<keyof AppConfigs['arena-monitor'], FormItemRule> = {
  gamePath: {
    validator: (_, value) => (value.length > 0 ? Promise.resolve() : Promise.reject(new Error('设置一下游戏路径>_<'))),
    trigger: 'change'
  },
  enableAutoMonitor: {},
  realm: enumRule(['NA', 'EU', 'ASIA'], '服务器区域配置不正确>_<')
}

const recordRules: Record<keyof AppConfigs['record'], FormItemRule> = {
  enableAutoRecord: {},
  cacheDays: {
    validator: (_, value) =>
      typeof value === 'number' && value >= 1 && value <= 365
        ? Promise.resolve()
        : Promise.reject(new Error('缓存天数需要在 1~365 之间>_<')),
    trigger: 'change'
  }
}

const themeOptions = reactive<SelectOption[]>([
  {
    label: '明亮',
    value: 'light'
  },
  {
    label: '黑暗',
    value: 'dark'
  }
])
const arenaMonitorDirectionOptions = reactive<SelectOption[]>([
  {
    label: 'LTR',
    value: 'ltr'
  },
  {
    label: 'RTL',
    value: 'rtl'
  }
])

const shipNameLanguageOptions = reactive<SelectOption[]>([
  {
    label: '简体中文',
    value: 'zh-cn'
  },
  {
    label: '繁體中文',
    value: 'zh-tw'
  },
  {
    label: 'English',
    value: 'en'
  },
  {
    label: '日本語',
    value: 'ja'
  }
])

const realmOptions = reactive<SelectOption[]>([
  {
    label: '美服',
    value: 'NA'
  },
  {
    label: '欧服',
    value: 'EU'
  },
  {
    label: '亚服',
    value: 'ASIA'
  }
])

// 配置加载 loading
const configLoading = ref<boolean>(true)

// 使用 useAsync 管理配置加载
const { execute: loadConfig } = useAsync({
  fn: async () => {
    const config = await window.ipc.settings.load()
    settingsForm.ui = config.ui
    settingsForm.arenaMonitor = config.arenaMonitor
    settingsForm.record = config.record ?? {
      enableAutoRecord: false,
      cacheDays: 30
    }
    return config
  },
  loading: configLoading,
  initialLoading: true,
  onError: () => {
    message.error('设置加载失败啦>_<')
  }
})

// 使用 useAsync 管理目录选择
const { execute: selectGamePath } = useAsync({
  fn: async () => {
    const path = await window.ipc.explorer.selectDirectory()
    settingsForm.arenaMonitor.gamePath = await window.ipc.explorer.normalizeGamePath(path)
    return path
  },
  onError: () => {
    message.error('这游戏路径不对吧')
  }
})

// 使用 useAsync 管理保存操作
const { execute: handleSave, loading: saveLoading } = useAsync({
  fn: async () => {
    await window.ipc.settings.save({
      ui: { ...settingsForm.ui },
      arenaMonitor: { ...settingsForm.arenaMonitor },
      record: { ...settingsForm.record }
    })
  },
  onSuccess: () => {
    emits('close')
  },
  onError: (error) => {
    if (error instanceof Error) {
      message.error(error.message)
    } else {
      message.error('保存好像失败了>_<')
    }
  }
})

// 使用 useSwitch 管理重置确认对话框
const { isOpen: resetConfirmShow, open: openResetConfirm, close: closeResetConfirm } = useSwitch()

// 使用 useAsync 管理重置操作
const { execute: handleReset } = useAsync({
  fn: async () => {
    await window.ipc.settings.reset()
    await loadConfig()
  },
  onSuccess: () => {
    closeResetConfirm()
  },
  onError: () => {
    message.error('操作失败了QAQ')
    closeResetConfirm()
  }
})

// 检查更新相关
const appVersion = __APP_VERSION__

const latestVersionInfo = reactive<{
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
}>({
  hasUpdate: false,
  latestVersion: '',
  currentVersion: appVersion
})

const { isOpen: updateConfirmShow, open: openUpdateConfirm, close: closeUpdateConfirm } = useSwitch()

const { isOpen: updateProgressShow, open: openUpdateProgress, close: closeUpdateProgress } = useSwitch()

const updateProgress = reactive({
  percent: 0,
  transferred: 0,
  total: 0
})

const { execute: handleCheckUpdate, loading: checkUpdateLoading } = useAsync({
  fn: async () => {
    const result = await window.ipc.update.check()
    latestVersionInfo.hasUpdate = result.hasUpdate
    latestVersionInfo.latestVersion = result.latestVersion
    latestVersionInfo.currentVersion = result.currentVersion
    if (result.hasUpdate) {
      await openUpdateConfirm()
    } else {
      message.success('当前已经是最新版本啦~')
    }
    return result
  },
  onError: () => {
    message.error('检查更新失败，请稍后重试')
  }
})

const { execute: handleDownloadUpdate, loading: downloadUpdateLoading } = useAsync({
  fn: async () => {
    await closeUpdateConfirm()
    updateProgress.percent = 0
    updateProgress.transferred = 0
    updateProgress.total = 0
    await openUpdateProgress()
    await window.ipc.update.download()
  },
  onSuccess: () => {
    closeUpdateProgress()
    message.success('安装包下载完成，正在执行更新...')
  },
  onError: () => {
    closeUpdateProgress()
    message.error('下载更新失败，请稍后重试')
  }
})

let unbindProgress: (() => void) | null = null

onMounted(async () => {
  await loadConfig()
  unbindProgress = window.ipc.update.onProgress((data) => {
    updateProgress.percent = data.percent
    updateProgress.transferred = data.transferred
    updateProgress.total = data.total
  })
})

onBeforeUnmount(() => {
  unbindProgress?.()
})
</script>

<template>
  <n-flex class="settings-page">
    <n-flex class="settings-menu" vertical>
      <n-menu v-model:value="activateMenuKey" :options="menuItems" responsive />
      <n-button style="margin-top: auto" @click="openResetConfirm" @mousedown.prevent> 恢复默认 </n-button>
    </n-flex>
    <n-divider style="height: 100%" vertical />
    <n-flex style="flex: 1" vertical>
      <n-spin :show="configLoading" class="settings-form">
        <n-form
          v-show="activateMenuKey === 'system'"
          :model="settingsForm.ui"
          :rules="uiRules"
          :show-require-mark="false">
          <n-form-item label="UI主题" path="theme">
            <n-select v-model:value="settingsForm.ui.theme" :options="themeOptions" />
          </n-form-item>
          <n-form-item label="我方队伍UI方向" path="allyUI">
            <n-select v-model:value="settingsForm.ui.allyUI" :options="arenaMonitorDirectionOptions" />
          </n-form-item>
          <n-form-item label="敌方队伍UI方向" path="enemyUI">
            <n-select v-model:value="settingsForm.ui.enemyUI" :options="arenaMonitorDirectionOptions" />
          </n-form-item>
          <n-form-item label="舰船名称语言" path="shipNameLanguage">
            <n-select v-model:value="settingsForm.ui.shipNameLanguage" :options="shipNameLanguageOptions" />
          </n-form-item>
        </n-form>
        <n-form
          v-show="activateMenuKey === 'arena-monitor'"
          :model="settingsForm.arenaMonitor"
          :rules="arenaMonitorRules"
          :show-require-mark="false">
          <n-form-item label="游戏路径" path="gamePath">
            <n-input-group>
              <n-input
                v-model:value="settingsForm.arenaMonitor.gamePath"
                placeholder="设置你的游戏路径，replays目录所在的路径就行了" />
              <n-button secondary strong type="tertiary" @click="selectGamePath" @mousedown.prevent>浏览</n-button>
            </n-input-group>
          </n-form-item>
          <n-form-item label="自动监控" path="enableAutoMonitor">
            <n-switch v-model:value="settingsForm.arenaMonitor.enableAutoMonitor" />
          </n-form-item>
          <n-form-item label="服务器区域" path="realm">
            <n-select v-model:value="settingsForm.arenaMonitor.realm" :options="realmOptions" />
          </n-form-item>
        </n-form>
        <n-form
          v-show="activateMenuKey === 'record'"
          :model="settingsForm.record"
          :rules="recordRules"
          :show-require-mark="false">
          <n-form-item label="自动记录对局" path="enableAutoRecord">
            <n-switch v-model:value="settingsForm.record.enableAutoRecord" />
          </n-form-item>
          <n-form-item label="缓存天数" path="cacheDays">
            <n-input-number v-model:value="settingsForm.record.cacheDays" :max="365" :min="1" />
          </n-form-item>
        </n-form>
        <n-flex v-show="activateMenuKey === 'update'" :size="24" vertical>
          <n-statistic label="当前版本">
            <n-gradient-text type="primary">{{ latestVersionInfo.currentVersion }}</n-gradient-text>
          </n-statistic>
          <n-button :loading="checkUpdateLoading" type="primary" @click="handleCheckUpdate"> 检查更新 </n-button>
        </n-flex>
      </n-spin>
      <n-flex align="center" class="settings-option" justify="end" @mousedown.prevent>
        <n-button type="tertiary" @click="() => emits('close')">关闭</n-button>
        <n-button :loading="saveLoading" type="primary" @click="handleSave">保存</n-button>
      </n-flex>
    </n-flex>
  </n-flex>
  <n-modal v-model:show="resetConfirmShow">
    <n-card :bordered="false" style="width: 600px" title="确认">
      <template #header-extra>
        <n-button secondary size="small" type="tertiary" @click="closeResetConfirm">
          <template #icon>
            <close-outlined />
          </template>
        </n-button>
      </template>
      <n-text>确定要恢复默认设置？</n-text>
      <template #footer>
        <n-flex justify="end" style="width: 100%">
          <n-button secondary type="tertiary" @click="closeResetConfirm"> 取消 </n-button>
          <n-button secondary type="primary" @click="handleReset"> 确定 </n-button>
        </n-flex>
      </template>
    </n-card>
  </n-modal>
  <n-modal v-model:show="updateConfirmShow">
    <n-card :bordered="false" style="width: 600px" title="发现新版本">
      <template #header-extra>
        <n-button secondary size="small" type="tertiary" @click="closeUpdateConfirm">
          <template #icon>
            <close-outlined />
          </template>
        </n-button>
      </template>
      <n-flex :size="12" vertical>
        <n-text>
          最新版本：
          <n-gradient-text type="primary">{{ latestVersionInfo.latestVersion }}</n-gradient-text>
        </n-text>
        <n-text>当前版本：{{ latestVersionInfo.currentVersion }}</n-text>
        <n-text>是否立即下载并安装更新？</n-text>
      </n-flex>
      <template #footer>
        <n-flex justify="end" style="width: 100%">
          <n-button secondary type="tertiary" @click="closeUpdateConfirm"> 取消 </n-button>
          <n-button :loading="downloadUpdateLoading" secondary type="primary" @click="handleDownloadUpdate">
            立即更新
          </n-button>
        </n-flex>
      </template>
    </n-card>
  </n-modal>
  <n-modal v-model:show="updateProgressShow" :close-on-esc="false" :mask-closable="false">
    <n-card :bordered="false" :closable="false" style="width: 500px" title="正在下载更新">
      <n-flex :size="16" vertical>
        <n-progress :indicator-placement="'inside'" :percentage="updateProgress.percent" type="line" />
        <n-text style="text-align: center" type="info">
          {{ Math.round(updateProgress.transferred / 1024 / 1024) }} MB /
          {{ Math.round(updateProgress.total / 1024 / 1024) }} MB
        </n-text>
      </n-flex>
    </n-card>
  </n-modal>
</template>

<style scoped>
.settings-page {
  width: 100%;
  height: 100%;
}

.settings-menu {
  width: 120px;
  height: 100%;
}

.settings-form {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.settings-option {
  width: 100%;
  height: 40px;
}
</style>
