<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue'
import { FormInst, FormItemRule, useMessage } from 'naive-ui'
import useAsync from '@renderer/composables/useAsync'
import AppFooter from '@renderer/components/AppFooter.vue'
import AuthorDisclaimer from '@renderer/components/AuthorDisclaimer.vue'
import type { PageChannelEmits } from '@renderer/composables/usePageChannel'

const message = useMessage()

const form = reactive<{
  code: string
}>({
  code: ''
})
const formRef = ref<FormInst | null>(null)
const rules: Record<keyof typeof form, FormItemRule> = {
  code: {
    required: true,
    message: '输入邀请码，可以去找作者要。。。',
    trigger: 'blur'
  }
}

const emit = defineEmits<PageChannelEmits>()

const { execute: handleActivate, loading: activateLoading } = useAsync<boolean, [string]>({
  fn: async (code: string) => {
    return await window.ipc.auth.activate(code)
  },
  onSuccess: (result) => {
    if (result) {
      message.info('激活成功，欢迎👏')
      emit('channel', { type: 'activated' })
    } else {
      message.error('邀请码不能用哦❌')
    }
  },
  onError: () => {
    message.error('激活失败了，再试一次吧')
  }
})

const handleSubmit = (e: MouseEvent): void => {
  e.preventDefault()
  formRef.value?.validate((errors) => {
    if (!errors) {
      handleActivate(form.code)
    } else {
      message.error('邀请码似乎不太正常')
    }
  })
}

const isActivated = ref<boolean>(true)
const declModalShow = ref<boolean>(true)

const handleAcknowledge = (): void => {
  declModalShow.value = false
}

const handleExit = (): void => {
  window.ipc.window.close()
}

onMounted(async () => {
  const activated = await window.ipc.auth.check()
  if (!activated) {
    isActivated.value = false
  }
})
</script>

<template>
  <n-flex align="center" class="activate-page" justify="center" vertical>
    <n-flex :size="20" class="activate-form-wrapper" vertical>
      <n-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="activate-form"
        label-align="left"
        label-placement="top"
        size="large">
        <n-form-item label="邀请码" path="code">
          <n-input v-model:value="form.code" clearable placeholder="请输入邀请码，可以去找作者要。。。" />
        </n-form-item>
        <n-form-item>
          <n-button
            :disabled="isActivated"
            :loading="activateLoading"
            attr-type="button"
            ghost
            style="width: 100%"
            type="primary"
            @click="handleSubmit">
            提交
          </n-button>
        </n-form-item>
      </n-form>
    </n-flex>

    <app-footer />

    <author-disclaimer v-model:show="declModalShow" mode="modal" @acknowledge="handleAcknowledge" @exit="handleExit" />
  </n-flex>
</template>

<style scoped>
.activate-page {
  width: 100%;
  height: 100%;
  position: relative;
}

.activate-form-wrapper {
  width: 72%;
  max-width: 520px;
}

.activate-form {
  width: 100%;
}
</style>
