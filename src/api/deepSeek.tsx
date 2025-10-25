/**
 * DeepSeek AI对话实现
 *
 * 功能概述：
 * - 集成DeepSeek的deepseek-chat模型进行对话和翻译
 * - 兼容OpenAI Chat Completions接口格式
 * - 支持流式响应、请求中断、错误处理等完整功能
 *
 * 技术细节：
 * - 使用DeepSeek官方API接口
 * - 处理流式响应的SSE数据格式
 * - 支持请求配置覆盖和灵活设置
 */
import { getSetting } from '@/storage/sync';
import { toastManager } from '@/components/Toast';
import type { Chat, Message } from '@/types/chat';
import { handleStream } from '@/utils';
import { Setting } from '@/types';

/**
 * 通用聊天构造函数接口
 * 定义所有聊天引擎类需要的回调函数和参数
 */
export interface ChatConstructor {
  onError?: (err: string) => void;          // 错误回调
  onGenerating?: (text: string) => void;    // 生成中回调
  onBeforeRequest?: () => void;             // 请求前回调
  onComplete: (text: string) => void;       // 完成回调
  onClear?: () => void;                     // 清空回调
  preMessageList?: Message[];               // 预加载消息列表
}

/**
 * DeepSeek特定构造函数接口
 * 扩展通用接口，增加DeepSeek特有的配置选项
 */
export interface OpenAIConstructor extends ChatConstructor {
  settingConfig?: Pick<Setting, 'deepSeekApiKey'>;  // DeepSeek API密钥配置
}

/**
 * DeepSeek对话实现类
 *
 * 实现Chat接口，提供与DeepSeek AI模型的对话功能
 * 兼容OpenAI接口格式，支持流式响应和完整的状态管理
 */
export default class DeepSeekClass implements Chat {
  controller: AbortController;                    // 请求控制器，用于中断操作
  messageList: Message[];                         // 消息历史列表
  onError?: (err: string) => void;               // 错误回调函数
  onBeforeRequest?: () => void;                  // 请求前回调函数
  onGenerating?: (text: string) => void;         // 生成中回调函数
  onComplete: (text: string) => void;            // 完成回调函数
  onClear?: () => void;                          // 清空回调函数
  settingConfig?: Pick<Setting, 'deepSeekApiKey'>; // 设置配置覆盖

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
    preMessageList,
    settingConfig
  }: OpenAIConstructor) {
    this.controller = new AbortController();
    this.messageList = preMessageList ? preMessageList : [];
    this.onBeforeRequest = onBeforeRequest;
    this.onError = onError;
    this.onGenerating = onGenerating;
    this.onComplete = onComplete;
    this.onClear = onClear;
    this.settingConfig = settingConfig;
  }

  /**
   * 发送消息给DeepSeek
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

      // DeepSeek API配置
      const url = 'https://api.deepseek.com/chat/completions';
      const model = 'deepseek-chat';
      const apiKey = this.settingConfig?.deepSeekApiKey ?? setting.deepSeekApiKey;

      // 检查API密钥
      if (!apiKey) {
        this.onError && this.onError('DeepSeek API密钥为空');
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
          toastManager.add({ type: 'error', msg: json.error.message });
        }
        this.onError && this.onError(json.error);
        return;
      }

      // 处理流式响应
      const reader = res.body.getReader();
      handleStream(reader, (data) => {
        if (data !== '[DONE]') {
          const json = JSON.parse(data);
          if (json.error) {
            toastManager.add({ type: 'error', msg: json.error.message });
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
      console.error('DeepSeek请求错误:', error);
      this.onError && this.onError('DeepSeek请求失败');
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
