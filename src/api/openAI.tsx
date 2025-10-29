import { defaultSetting } from '@/utils/const'
import { getSetting } from '@/storage/sync'
import { toastManager } from '@/components/Toast'
import type { Chat, Message } from '@/types/chat'
import { handleStream } from '@/utils'
import { Setting } from '@/types'
//import { addOpenAIRecords } from '@/utils/storage'
export interface ChatConstructor {
  onError?: (err: string) => void
  onGenerating?: (text: string) => void
  onBeforeRequest?: () => void
  onComplete: (text: string) => void
  onClear?: () => void
  preMessageList?: Message[]
}
export interface OpenAIConstructor extends ChatConstructor{
  settingConfig?:Pick<Setting, 'openAIAddress'|'openAIKey'|'openAIModel'>
}

export default class OpenAIClass implements Chat {
  controller: AbortController
  messageList: Message[]
  onError?: (err: string) => void
  onBeforeRequest?: () => void
  onGenerating?: (text: string) => void
  onComplete: (text: string) => void
  onClear?: () => void
  settingConfig?:Pick<Setting, 'openAIAddress'|'openAIKey'|'openAIModel'>
  constructor({
    onError,
    onGenerating,
    onBeforeRequest,
    onComplete,
    onClear,
    preMessageList,
    settingConfig
  }: OpenAIConstructor) {
    // 为每个实例初始化一个可复用的 AbortController
    this.controller = new AbortController()
    this.messageList = preMessageList ? preMessageList : []
    this.onBeforeRequest = onBeforeRequest
    this.onError = onError
    this.onGenerating = onGenerating
    this.onComplete = onComplete
    this.onClear = onClear
    this.settingConfig = settingConfig
  }
  async sendMessage(content?:string) {
    try {
      // 请求前回调：用于设置 loading/清空旧结果等
      this.onBeforeRequest && await this.onBeforeRequest()
      if (this.controller.signal.aborted) {
        // 若上次已中止，则需重建控制器
        this.controller = new AbortController()
      }
      const setting = await getSetting()
      const url =  this.settingConfig?.openAIAddress ?? setting.openAIAddress ?? defaultSetting.openAIAddress
      const model = this.settingConfig?.openAIModel ?? setting.openAIModel?? defaultSetting.openAIModel
      const apiKey = this.settingConfig?.openAIKey ?? setting.openAIKey
      if (!apiKey) {
        // 缺少 Key：报错并返回
        this.onError && this.onError('apiKey is empty')
        return
      }
      let result = '';
      // 追加用户消息；并预置一条空的 assistant 消息承接流式内容
      content && this.messageList.push({role: 'user', content});
      this.messageList.push({role: 'assistant', content: ''})
      const res = await fetch(url, {
        method: 'POST',
        signal: this.controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: this.messageList.slice(0, -1),
          stream: true,
        }),
      })
      if (!res.ok || !res.body) {
        // 失败：尝试解析错误信息并提示
        const json = await res.json()
        if (json.error.message) {
          toastManager.add({ type: 'error', msg: json.error.message })
        }
        this.onError && this.onError(json.error)
        return
      }
      const reader = res.body.getReader();
      handleStream(reader, (data)=> {
        if (data !== '[DONE]') {
          const json = JSON.parse(data)
          if (json.error) {
            toastManager.add({ type: 'error', msg: json.error.message })
            this.onError && this.onError(json.error)
            return
          }            
          const text = json.choices[0].delta.content || '';
          result += text;
          // 将增量内容写入最后一条 assistant 消息，实现流式渲染
          this.messageList = this.messageList.map((message, index) => {
            if (index === this.messageList.length - 1) {
              return {...message, ...{content: message.content + text}}
            } else {
              return message
            }
          })
          this.onGenerating && this.onGenerating(result)
        } else {
          // 服务端标记结束：回调完整内容
          this.onComplete(this.messageList[this.messageList.length-1].content)
        }
      })
    } catch (error) {
      console.log(error);
      this.onError && this.onError('request failed')
    }
  }
  clearMessage() {
    // 用户关闭卡片时中止请求并清空上下文
    this.controller.abort('card is hidden')
    this.messageList = []
    this.onClear && this.onClear()
  }
  refresh() {
    // 去掉占位的最后一条 assistant，再次发送以复用上下文
    this.messageList = this.messageList.slice(0, -1);
    this.sendMessage()
  }
  abort(){
    // 主动中止：用于用户手动停止
    this.controller.abort('card is hidden')
  }
}
/**
 * OpenAI Chat Completions 封装
 * - 支持流式与非流式返回
 * - 通过 formateMessage 做角色/格式兼容
 */
