/**
 * 模块概述：OpenAI 对话实现
 * - 以 OpenAI Chat Completions 接口为基础，封装消息上下文、流式增量处理、错误展示等。
 *
 * 关键点：
 * - 使用 AbortController 支持中断；
 * - 通过 handleStream 解析 SSE 流式返回；
 * - 从同步存储读取 `openAIAddress/openAIKey/openAIModel`，也可通过 `settingConfig` 覆盖。
 */
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

/**
 * OpenAIClass
 * - 实现 Chat 接口的一个具体类，管理消息队列与请求生命周期。
 */
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
    this.controller = new AbortController()
    this.messageList = preMessageList ? preMessageList : []
    this.onBeforeRequest = onBeforeRequest
    this.onError = onError
    this.onGenerating = onGenerating
    this.onComplete = onComplete
    this.onClear = onClear
    this.settingConfig = settingConfig
  }
  /**
   * 发送/继续对话
   * @param content 新增的用户消息，若为空则重放上一轮上下文以继续生成
   * 行为：
   * - 读取设置与可选配置，拼装请求；
   * - 流式读取增量 token，通过 onGenerating 回传；
   * - 结束时通过 onComplete 输出最终助手消息。
   */
  async sendMessage(content?:string) {
    try {
      this.onBeforeRequest && await this.onBeforeRequest()
      if (this.controller.signal.aborted) {
        this.controller = new AbortController()
      }
      const setting = await getSetting()
      const url =  this.settingConfig?.openAIAddress ?? setting.openAIAddress ?? defaultSetting.openAIAddress
      const model = this.settingConfig?.openAIModel ?? setting.openAIModel?? defaultSetting.openAIModel
      const apiKey = this.settingConfig?.openAIKey ?? setting.openAIKey
      if (!apiKey) {
        this.onError && this.onError('apiKey is empty')
        return
      }
      let result = '';
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
          this.messageList = this.messageList.map((message, index) => {
            if (index === this.messageList.length - 1) {
              return {...message, ...{content: message.content + text}}
            } else {
              return message
            }
          })
          this.onGenerating && this.onGenerating(result)
        } else {
          this.onComplete(this.messageList[this.messageList.length-1].content)
        }
      })
    } catch (error) {
      console.log(error);
      this.onError && this.onError('request failed')
    }
  }
  /**
   * 清空当前会话上下文并中断可能存在的请求
   */
  clearMessage() {
    this.controller.abort('card is hidden')
    this.messageList = []
    this.onClear && this.onClear()
  }
  /**
   * 去掉最后一条（正在生成的）消息，基于之前上下文重新请求
   */
  refresh() {
    this.messageList = this.messageList.slice(0, -1);
    this.sendMessage()
  }
  /**
   * 主动中断请求（例如卡片被关闭时）
   */
  abort(){
    this.controller.abort('card is hidden')
  }
}
