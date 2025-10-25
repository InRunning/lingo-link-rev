/**
 * 模块概述：自定义 OpenAI 兼容接口的对话实现
 * - 允许用户在设置中配置 `customAIAddress/model/key`，只要兼容 OpenAI Chat Completions 即可使用。
 * - 与 OpenAIClass 基本一致：支持流式、错误提示、刷新/中止等。
 */
import { getSetting } from '@/storage/sync'
import { toastManager } from '@/components/Toast'
import type { Chat, Message } from '@/types/chat'
import { handleStream } from '@/utils'
//import { addOpenAIRecords } from '@/utils/storage'
export interface ChatConstructor {
  onError?: (err: string) => void
  onGenerating?: (text: string) => void
  onBeforeRequest?: () => void
  onComplete: (text: string) => void
  onClear?: () => void
  preMessageList?: Message[]
}


/**
 * CustomAIClass
 * - 面向用户自建/第三方代理的 OpenAI 兼容 API。
 */
export default class CustomAIClass implements Chat {
  controller: AbortController
  messageList: Message[]
  onError?: (err: string) => void
  onBeforeRequest?: () => void
  onGenerating?: (text: string) => void
  onComplete: (text: string) => void
  onClear?: () => void
  constructor({
    onError,
    onGenerating,
    onBeforeRequest,
    onComplete,
    onClear,
    preMessageList,
  }: ChatConstructor) {
    this.controller = new AbortController()
    this.messageList = preMessageList ? preMessageList : []
    this.onBeforeRequest = onBeforeRequest
    this.onError = onError
    this.onGenerating = onGenerating
    this.onComplete = onComplete
    this.onClear = onClear
  }
  /**
   * 发送/继续对话（使用自定义 API）
   * @param content 新增的用户消息
   */
  async sendMessage(content?:string) {
    try {
      this.onBeforeRequest && await this.onBeforeRequest()
      if (this.controller.signal.aborted) {
        this.controller = new AbortController()
      }
      const setting = await getSetting();
      if (!setting.customAIAddress) {
        toastManager.add({
          type: 'error',
          msg: 'url is empty'
        })
        return
      }
      const url =   setting.customAIAddress;
      const model = setting.customAIModel;
      let result = '';
      content && this.messageList.push({role: 'user', content});
      this.messageList.push({role: 'assistant', content: ''});
      const res = await fetch(url, {
        method: 'POST',
        signal: this.controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(setting.customAIKey ? {Authorization:
            `Bearer ${setting.customAIKey}`}: {})
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
   * 清空上下文并中止请求
   */
  clearMessage() {
    this.controller.abort('request failed')
    this.messageList = []
    this.onClear && this.onClear()
  }
  /**
   * 基于先前上下文重新发送
   */
  refresh() {
    this.messageList = this.messageList.slice(0, -1);
    this.sendMessage()
  }
  /**
   * 主动中止请求
   */
  abort(){
    this.controller.abort('request failed')
  }
}
