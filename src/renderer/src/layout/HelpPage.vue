<script lang="ts" setup>
import { reactive, ref } from 'vue'
import { MenuOption } from 'naive-ui'
import AuthorDisclaimer from '@renderer/components/AuthorDisclaimer.vue'
import ExternalLink from '@renderer/components/ExternalLink.vue'

const menuItems = reactive<MenuOption[]>([
  {
    key: 'intro',
    label: '应用介绍'
  },
  {
    key: 'data-system',
    label: '对局监控数据体系'
  },
  {
    key: 'record-system',
    label: '战绩记录说明'
  },
  {
    key: 'faq',
    label: '常见问题'
  },
  {
    key: 'changelog',
    label: '更新日志'
  },
  {
    key: 'disclaimer',
    label: '作者声明'
  }
])
const activeMenuKey = ref<string>('intro')
</script>

<template>
  <n-flex class="help-page">
    <n-flex class="help-menu" vertical>
      <n-menu v-model:value="activeMenuKey" :options="menuItems" responsive />
    </n-flex>
    <n-divider style="height: 100%" vertical />
    <n-flex class="help-content" vertical>
      <!-- 应用介绍 -->
      <n-scrollbar v-if="activeMenuKey === 'intro'">
        <n-flex :size="16" class="help-content-panel" vertical>
          <n-h1>迷路町（mairomachi）</n-h1>
          <n-p>
            迷路町是一款专为《战舰世界》（World of
            Warships）玩家设计的桌面端对局数据查询应用。能够在对局开始时自动获取双方玩家的战绩数据（目前仅限
            <n-text code>随机战</n-text>
            的对局），并以直观的方式展示在界面上，帮助你快速判断敌我实力分布。
          </n-p>

          <n-h2>主要功能</n-h2>
          <n-ul>
            <n-li> <strong>自动对局监控</strong>：无需手动操作，检测到对局后自动解析并加载数据。 </n-li>
            <n-li>
              <strong>玩家实力评估</strong>：基于
              <external-link url="https://wows-numbers.com/"> wows-numbers </external-link>
              的PR评分体系。
            </n-li>
            <n-li> <strong>可视化图表</strong>：提供雷达图、折线图和饼图，从多个角度对比双方队伍的整体实力。 </n-li>
            <n-li> <strong>战绩记录</strong>：自动保存并解析最近的对局回放，随时查看历史战斗的详细数据和统计。 </n-li>
            <n-li> <strong>多语言舰船名称</strong>：支持简中、繁中、英文、日文四种语言的舰船名称切换。 </n-li>
            <n-li> <strong>自动更新</strong>：启动时自动检测新版本，后台下载并静默安装，无需手动去官网下载。 </n-li>
          </n-ul>

          <n-h2>使用流程</n-h2>
          <n-ol>
            <n-li>首次使用输入邀请码激活设备。</n-li>
            <n-li>在"设置"中配置游戏路径并开启自动监控与自动记录。</n-li>
            <n-li>进入"对局"页面，等待游戏开始；数据将自动加载并展示。</n-li>
            <n-li>对局结束后，可在"记录"页面查看已保存的历史战绩。</n-li>
          </n-ol>

          <n-h2>注意事项</n-h2>
          <n-p>
            本应用需要配合服务端服务使用，确保本地网络可以连接到服务端。如果某位玩家设置了隐藏战绩，则仅显示其基础信息，PR
            相关数据将不会展示。
          </n-p>
        </n-flex>
      </n-scrollbar>

      <!-- 对局监控数据体系 -->
      <n-scrollbar v-if="activeMenuKey === 'data-system'">
        <n-flex :size="16" class="help-content-panel" vertical>
          <n-h1>对局监控数据体系</n-h1>
          <n-p>
            本页面介绍对局监控中为每位玩家展示的各项数据的含义、计算方式以及如何使用它们进行对局判断。期望数据来源、PR计算与颜色均参考
            <external-link url="https://wows-numbers.com/"> wows-numbers </external-link>
            的PR评分体系。
          </n-p>

          <n-h2>1. 核心评分</n-h2>

          <n-h3>总览 RPR（快速个人评分）</n-h3>
          <n-p> 基于玩家<strong>账号总战绩</strong>使用所有舰船的全局平均期望数据作为基准，计算出的PR近似值。 </n-p>

          <n-h3>总览 TT-RPR（等级-类型个人评分）</n-h3>
          <n-p>
            基于玩家<strong>账号总战绩</strong>，使用与<strong>当前舰船同等级、同类型</strong>的服务器期望数据平均值计算出的PR近似值。
          </n-p>

          <n-h3>舰船 PR（精确个人评分）</n-h3>
          <n-p> 基于玩家在当前<strong>特定舰船上</strong>的战绩和与该舰船自身的服务器期望数据计算出的精确PR。 </n-p>

          <n-h3>舰船 TT-RPR（舰船等级-类型个人评分）</n-h3>
          <n-p>
            基于玩家当前<strong>特定舰船上</strong>的战绩，使用与<strong>当前舰船同等级、同类型</strong>的服务器期望数据平均值计算出的PR近似值。
          </n-p>

          <n-h2>3. 图表说明</n-h2>
          <n-ul>
            <n-li> <strong>雷达图</strong>：对比敌我双方在六项核心指标上的平均值。 </n-li>
            <n-li> <strong>折线图</strong>：按舰种→等级→PR 排序后，展示敌我双方每位玩家的舰船 PR 分布。 </n-li>
            <n-li> <strong>饼图</strong>：统计敌我双方舰船 PR 等级的数量占比。 </n-li>
          </n-ul>
        </n-flex>
      </n-scrollbar>

      <!-- 战绩记录说明 -->
      <n-scrollbar v-if="activeMenuKey === 'record-system'">
        <n-flex :size="16" class="help-content-panel" vertical>
          <n-h1>战绩记录说明</n-h1>
          <n-p>
            战绩记录功能会自动识别并解析你的
            <n-text code>.wowsreplay</n-text>
            回放文件，将每一场战斗的关键数据结构化保存下来，方便查看和统计<n-text delete>（开庭队友）</n-text>。
          </n-p>

          <n-h2>1. 数据来源</n-h2>
          <n-p>
            当你在游戏内完成一场战斗后，游戏会自动在
            <n-text code>replays</n-text> 目录下生成一个以时间戳命名的
            <n-text code>.wowsreplay</n-text>
            文件。迷路町的文件监听器会识别到这个新文件，并调用本地解析引擎提取战后数据。
          </n-p>

          <n-h2>2. 自动保存机制</n-h2>
          <n-ul>
            <n-li>需要在"设置"中开启 <strong>自动保存对局记录</strong> 功能。</n-li>
            <n-li>解析成功后，战绩数据会被存储在本地缓存中。</n-li>
            <n-li>你可以设置缓存天数，超过期限的旧记录会自动清理。</n-li>
          </n-ul>

          <n-h2>3. 战绩详情里有什么</n-h2>
          <n-p>
            点击任意战绩卡片可以进入详情页，其中展示了该场对局中所有玩家的最终数据，包括：伤害、击杀、经验、舰船、PR等。
            <n-blockquote style="margin-top: 4px">
              PR计算注意事项：胜方胜率用100%计算，PR可能偏高；败方用0%胜率计算，PR可能偏低。
            </n-blockquote>
          </n-p>

          <n-h2>4. 手动管理</n-h2>
          <n-ul>
            <n-li>在记录列表页，你可以点击卡片查看详情。</n-li>
            <n-li>每条记录右上角都有删除按钮，可以随时手动清理不需要的记录。</n-li>
          </n-ul>
        </n-flex>
      </n-scrollbar>

      <!-- 常见问题 -->
      <n-scrollbar v-if="activeMenuKey === 'faq'">
        <n-flex :size="16" class="help-content-panel" vertical>
          <n-h1>常见问题</n-h1>

          <n-collapse>
            <n-collapse-item title="Q1：首次使用需要做什么？">
              <n-p>
                首次启动应用后，你需要输入一个邀请码（激活码）来完成设备激活。激活成功后，应用会生成一套专属于当前设备的
                Ed25519 密钥对，并与你的设备指纹绑定。此后每次启动都会自动登录，无需再次输入。
              </n-p>
            </n-collapse-item>

            <n-collapse-item title="Q2：对局页面一直显示“当前未检测到对局”怎么办？">
              <n-p>
                请检查"设置"中的
                <strong>游戏路径</strong> 是否正确配置，并确保已开启
                <strong>自动对局监控</strong>。游戏路径应该是《战舰世界》的根目录（即包含
                <n-text code>WorldOfWarships.exe</n-text> 和 <n-text code>replays</n-text> 文件夹的目录）。
              </n-p>
            </n-collapse-item>

            <n-collapse-item title="Q3：为什么有些玩家没有 PR 数据？">
              <n-p>
                如果该玩家在 Wargaming
                官方网站上设置了<strong>隐藏战绩</strong>，服务端将无法获取到有效数据。此时玩家卡片上只会显示舰船、公会等基础信息。
              </n-p>
            </n-collapse-item>

            <n-collapse-item title="Q4：战绩记录页面为什么是空的？">
              <n-p>
                请确认"设置"中已开启
                <strong>自动保存对局记录</strong>
                并配置了正确的游戏路径。开启后，从下一场战斗开始，新产生的回放文件才会被自动解析并保存，此前的历史回放不会被处理。
              </n-p>
            </n-collapse-item>

            <n-collapse-item title="Q5：客户端提示“激活已过期”怎么办？">
              <n-p>
                这种情况通常发生在服务端重置了设备状态、Token
                被废除、或你在多台设备上使用了同一激活码导致旧设备被挤掉。应用会自动清空本地凭证并跳转回激活页，你只需重新输入邀请码即可再次激活。
              </n-p>
            </n-collapse-item>

            <n-collapse-item title="Q6：自动更新失败怎么办？">
              <n-p>
                自动更新需要连接服务端下载安装包。如果下载失败，通常会弹出提示。你可以稍后重试，或者关注官方渠道获取最新版本的安装包手动覆盖安装。
              </n-p>
            </n-collapse-item>

            <n-collapse-item title="Q7：应用安全吗？会被封号吗？">
              <n-p>
                迷路町仅读取本地 <n-text code>replays</n-text> 目录的公开数据和 Wargaming 官方
                API，不会修改游戏内存、注入 DLL 或拦截网络包。其工作原理与常见的战绩查询网站无异。但任何第三方工具都无法
                100% 保证官方政策不变，请自行评估风险后使用。
              </n-p>
            </n-collapse-item>
          </n-collapse>
        </n-flex>
      </n-scrollbar>

      <!-- 更新日志 -->
      <n-scrollbar v-if="activeMenuKey === 'changelog'">
        <n-flex :size="16" class="help-content-panel" vertical>
          <n-h1>更新日志</n-h1>

          <n-timeline>
            <n-timeline-item content="初版发布。" time="2026-04-20" title="v1.0.0" type="success" />
            <n-timeline-item
              content="replay解析算法优化；对局胜负判定优化；对局监控、对局记录UI优化。"
              time="2026-04-22"
              title="v1.1.0"
              type="success" />
          </n-timeline>
        </n-flex>
      </n-scrollbar>

      <!-- 作者声明 -->
      <n-scrollbar v-if="activeMenuKey === 'disclaimer'">
        <author-disclaimer mode="inline" />
      </n-scrollbar>
    </n-flex>
  </n-flex>
</template>

<style scoped>
.help-page {
  width: 100%;
  height: 100%;
}

.help-menu {
  width: 240px;
  height: 100%;
}

.help-content {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.help-content-panel {
  padding: 8px;
}
</style>
