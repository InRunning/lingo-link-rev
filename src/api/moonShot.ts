/**
 * 月之暗面（MoonShot）AI对话实现
 *
 * 功能概述：
 * - 集成月之暗面的moonshot-v1-8k模型进行对话和翻译
 * - 完全兼容OpenAI Chat Completions接口格式
 * - 支持流式响应、API Key认证、请求中断等完整功能
 *
 * 技术细节：
 * - 使用月之暗面官方API接口
 * - 处理OpenAI兼容的流式响应格式
 * - 使用moonshot-v1-8k模型（8K上下文长度）
 * - 简化错误处理，不使用toast提示
 */
import { getSetting } from '@/storage/sync';
import type { Chat, Message } from '@/types/chat';
import { handleStream } from '@/utils';

/**
 * 通用聊天构造函数接口
 * 定义所有聊天引擎类需要的回调函数和参数
 */
export interface ChatConstructor {
  onError: (err: string) => void;           // 错误回调（必填）
  onGenerating?: (text: string) => void;    // 生成中回调
  onBeforeRequest?: () => void;             // 请求前回调
  onComplete: (text: string) => void;       // 完成回调
  onClear?: () => void;                     // 清空回调
  preMessageList?: Message[];               // 预加载消息列表
}

/**
 * MoonShot特定构造函数接口
 * 目前没有特殊配置，直接继承通用接口
 */
export interface OpenAIConstructor extends ChatConstructor {
  // 目前没有特殊配置字段
}

/**
 * MoonShot对话实现类
 *
 * 实现Chat接口，提供与月之暗面AI模型的对话功能
 * 完全兼容OpenAI接口格式，使用API Key认证
 */
export default class MoonShotClass implements Chat {
  controller: AbortController;          // 请求控制器，用于中断操作
  messageList: Message[];               // 消息历史列表
  onError: (err: string) => void;       // 错误回调函数
  onBeforeRequest?: () => void;         // 请求前回调函数
  onGenerating?: (text: string) => void; // 生成中回调函数
  onComplete: (text: string) => void;    // 完成回调函数
  onClear?: () => void;                 // 清空回调函数

  /**
   * 构造函数
   * @param OpenAIConstructor 聊天配置对象
   */
  constructor({
    onError,
    onGenerating,
    onBeforeRequest,
    onComplete,
    onClear,
    preMessageList
  }: OpenAIConstructor) {
    this.controller = new AbortController();
    this.messageList = preMessageList ? preMessageList : [];
    this.onBeforeRequest = onBeforeRequest;
    this.onError = onError;
    this.onGenerating = onGenerating;
    this.onComplete = onComplete;
    this.onClear = onClear;
  }

  /**
   * 发送消息给MoonShot
   * @param content 用户消息内容
   */
  async sendMessage(content?: string) {
    try {
      // 调用请求前回调
      this.onBeforeRequest && await this.onBeforeRequest();

      // 检查并重置请求控制器
      if (this.controller.signal.aborted) {
        this.controller = new AbortController();
      }

      // 获取用户设置
      const setting = await getSetting();

      // MoonShot API配置
      const url = 'https://api.moonshot.cn/v1/chat/completions';
      const model = 'moonshot-v1-8k';
      const apiKey = setting.moonShotKey;

      // 检查API密钥
      if (!apiKey) {
        this.onError && this.onError('MoonShot API密钥为空');
        return;
      }

      let result = '';

      // 添加用户消息到历史记录
      content && this.messageList.push({ role: 'user', content });
      // 添加空的助手回复占位符
      this.messageList.push({ role: 'assistant', content: '' });

      // 发起API请求
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
      });

      // 处理响应错误
      if (!res.ok || !res.body) {
        const json = await res.json();
        if (json.error?.message) {
          this.onError(json.error.message);
        }
        return;
      }

      // 处理流式响应
      const reader = res.body.getReader();
      handleStream(reader, (data) => {
        if (data !== '[DONE]') {
          const json = JSON.parse(data);
          if (json.error) {
            this.onError(json.error.message);
            this.onError && this.onError(json.error);
            return;
          }
          // 提取生成文本
          const text = json.choices[0].delta.content || '';
          result += text;

          // 更新消息列表中的最后一条消息
          this.messageList = this.messageList.map((message, index) => {
            if (index === this.messageList.length - 1) {
              return { ...message, ...{ content: message.content + text } };
            } else {
              return message;
            }
          });

          // 调用生成中回调
          this.onGenerating && this.onGenerating(result);
        } else {
          // 完成时调用完成回调
          this.onComplete(this.messageList[this.messageList.length - 1].content);
        }
      });
    } catch (error) {
      this.onError && this.onError('MoonShot请求失败');
    }
  }

  /**
   * 清空消息历史并中断当前请求
   */
  clearMessage() {
    this.controller.abort('卡片已隐藏');
    this.messageList = [];
    this.onClear && this.onClear();
  }

  /**
   * 刷新 - 基于之前的上下文重新生成回复
   */
  refresh() {
    this.messageList = this.messageList.slice(0, -1);
    this.sendMessage();
  }

  /**
   * 中断当前请求
   */
  abort() {
    this.controller.abort('卡片已隐藏');
  }
}
