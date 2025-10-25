/**
 * 百度文心一言（ERNIE Bot）对话实现
 *
 * 功能概述：
 * - 集成百度文心一言ERNIE Bot模型进行对话和翻译
 * - 使用百度AI开放平台的AccessToken认证方式
 * - 支持流式响应和实时文本生成
 *
 * 技术细节：
 * - 调用百度AI开放平台的wenxinworkshop接口
 * - 使用ERNIE Bot 8K模型
 * - 处理百度特有的消息格式化要求
 * - 通过is_end字段判断流式响应结束
 */
import { toastManager } from '@/components/Toast';
import type { Chat, Message } from '@/types/chat';
import { ChatConstructor } from './openAI';
import { handleStream } from '@/utils';
import { formateMessage } from "@/utils";
import { getSetting } from '@/storage/sync';

/**
 * 文心一言构造函数接口
 * 扩展通用接口，文心一言目前没有特殊配置
 */
export interface WenxinConstructor extends ChatConstructor {
  // 目前没有特殊配置字段
}

/**
 * 文心一言对话实现类
 *
 * 实现Chat接口，提供与百度文心一言模型的对话功能
 * 支持百度AI开放平台的AccessToken认证和流式响应
 */
export default class WenxinClass implements Chat {
  controller: AbortController;           // 请求控制器，用于中断操作
  messageList: Message[];                // 消息历史列表
  onError?: (err: string) => void;       // 错误回调函数
  onBeforeRequest?: () => void;          // 请求前回调函数
  onGenerating?: (text: string) => void; // 生成中回调函数
  onComplete: (text: string) => void;    // 完成回调函数
  onClear?: () => void;                  // 清空回调函数

  /**
   * 构造函数
   * @param WenxinConstructor 聊天配置对象
   */
  constructor({
    onError,
    onGenerating,
    onBeforeRequest,
    onComplete,
    onClear,
    preMessageList
  }: WenxinConstructor) {
    this.controller = new AbortController();
    this.messageList = preMessageList ? preMessageList : [];
    this.onBeforeRequest = onBeforeRequest;
    this.onError = onError;
    this.onGenerating = onGenerating;
    this.onComplete = onComplete;
    this.onClear = onClear;
  }

  /**
   * 发送消息给文心一言
   * @param content 用户消息内容
   */
  async sendMessage(content?: string) {
    // 检查并重置请求控制器
    if (this.controller.signal.aborted) {
      this.controller = new AbortController();
    }

    // 获取用户设置的AccessToken
    const token = (await getSetting()).wenxinToken;
    if (!token) {
      toastManager.add({
        type: 'error',
        msg: '文心一言AccessToken为空'
      });
      return;
    }

    // 构建百度AI开放平台请求URL
    const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie_bot_8k?access_token=${token}`;

    try {
      // 添加用户消息到历史记录
      content && this.messageList.push({ role: 'user', content });
      // 添加空的助手回复占位符
      this.messageList.push({ role: 'assistant', content: '' });

      // 按文心一言要求格式化消息
      this.messageList = await formateMessage('wenxin', this.messageList);

      // 调用请求前回调
      this.onBeforeRequest && await this.onBeforeRequest();

      // 发起API请求
      const res = await fetch(url, {
        method: 'POST',
        signal: this.controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
      let result = '';
      handleStream(reader, (data) => {
        const json = JSON.parse(data);
        if (json.error) {
          toastManager.add({ type: 'error', msg: json.error.message });
          this.onError && this.onError(json.error);
          return;
        }

        // 提取生成文本（文心一言使用result字段）
        const text = json.result || '';
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

        // 检查是否结束（文心一言使用is_end字段）
        if (json.is_end) {
          this.onComplete(this.messageList[this.messageList.length - 1].content);
        }
      });
    } catch (error) {
      this.onError && this.onError('文心一言请求失败');
    }
  }

  /**
   * 刷新 - 基于之前的上下文重新生成回复
   */
  refresh() {
    this.messageList = this.messageList.slice(0, -1);
    this.sendMessage();
  }

  /**
   * 清空消息历史并中断当前请求
   */
  clearMessage() {
    this.controller.abort();
    this.messageList = [];
    this.onClear && this.onClear();
  }

  /**
   * 中断当前请求
   */
  abort() {
    this.controller.abort();
  }
}
