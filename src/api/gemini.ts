/**
 * Google Gemini AI对话实现
 *
 * 功能概述：
 * - 集成Google Gemini Pro模型进行对话和翻译
 * - 支持流式响应，实时显示生成内容
 * - 兼容OpenAI风格的消息列表格式
 *
 * 技术细节：
 * - 使用Gemini的streamGenerateContent接口
 * - 处理流式响应的JSON数据解析
 * - 将OpenAI格式的消息转换为Gemini格式
 * - 支持请求中断和错误处理
 */
import type { Chat, Message } from "@/types/chat";
import { ChatConstructor } from "./openAI";
import { getSetting } from "@/storage/sync";
import { toastManager } from "@/components/Toast";

/**
 * 解析流式JSON响应
 *
 * Gemini返回的是不完整的JSON片段，需要拼接和解析
 * @param currentText 当前累积的文本
 * @returns 解析结果和剩余文本
 */
function tryParse(currentText: string): {
  remainingText: string;
  parsedResponse: any;
} {
  let jsonText: string;
  
  // 处理以'['开始的JSON片段
  if (currentText.startsWith("[")) {
    if (currentText.endsWith("]")) {
      jsonText = currentText;
    } else {
      jsonText = currentText + "]";
    }
  }
  // 处理以','开始的JSON片段
  else if (currentText.startsWith(",")) {
    if (currentText.endsWith("]")) {
      jsonText = "[" + currentText.slice(1);
    } else {
      jsonText = "[" + currentText.slice(1) + "]";
    }
  }
  // 不是JSON格式，返回原文
  else {
    return {
      remainingText: currentText,
      parsedResponse: null,
    };
  }

  try {
    // 尝试解析JSON
    const parsedResponse = JSON.parse(jsonText);
    return {
      remainingText: "",
      parsedResponse,
    };
  } catch (e) {
    throw new Error(`无效的JSON格式: "${jsonText}"`);
  }
}
/**
 * Gemini对话实现类
 *
 * 实现了Chat接口，提供与Google Gemini Pro模型的对话功能
 */
export default class GeminiClass implements Chat {
  controller: AbortController;           // 请求控制器，用于中断请求
  messageList: Message[];                // 消息历史列表
  onError?: (err: string) => void;       // 错误回调函数
  onBeforeRequest?: () => void;          // 请求前回调函数
  onGenerating?: (text: string) => void; // 生成中回调函数
  onComplete: (text: string) => void;    // 完成回调函数
  onClear?: () => void;                  // 清空回调函数
  systemPrompt?: string;                 // 系统提示词（未使用）

  /**
   * 构造函数
   * @param ChatConstructor 聊天配置对象
   */
  constructor({
    onError,
    onGenerating,
    onBeforeRequest,
    onComplete,
    onClear,
    preMessageList,
  }: ChatConstructor) {
    this.controller = new AbortController();
    this.messageList = preMessageList ? preMessageList : [];
    this.onBeforeRequest = onBeforeRequest;
    this.onError = onError;
    this.onGenerating = onGenerating;
    this.onComplete = onComplete;
    this.onClear = onClear;
  }

  /**
   * 发送消息给Gemini
   * @param content 用户消息内容
   */
  async sendMessage(content?: string) {
    // 检查并重置请求控制器
    if (this.controller.signal.aborted) {
      this.controller = new AbortController();
    }

    // 获取用户设置的Gemini API密钥
    const key = (await getSetting()).geminiKey;
    if (!key) {
      toastManager.add({
        type: 'error',
        msg: 'Gemini API密钥为空'
      });
      return;
    }

    // 构建Gemini API请求URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${key}`;

    try {
      // 添加用户消息到历史记录
      content && this.messageList.push({ role: 'user', content });
      // 添加空的助手回复占位符
      this.messageList.push({ role: 'assistant', content: '' });

      // 将OpenAI格式的消息转换为Gemini格式
      const bodyMessage = this.messageList.slice(0, -1).map((item) => {
        if (item.role === "assistant") {
          return {
            role: "model",
            parts: [{ text: item.content }],
          };
        } else {
          return {
            role: "user",
            parts: [{ text: item.content }],
          };
        }
      });

      // 调用请求前回调
      this.onBeforeRequest && await this.onBeforeRequest();

      // 发起API请求
      const res = await fetch(url, {
        method: "POST",
        signal: this.controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: bodyMessage,
        }),
      });

      // 处理响应错误
      if (!res.ok || !res.body) {
        const json = await res.json();
        if (json[0]?.error) {
          const message = json[0].error.message || json[0].error;
          this.onError && this.onError(message);
          return;
        }
        this.onError && this.onError(json.error);
        return;
      }

      // 处理流式响应
      const reader = res.body.getReader();
      let result = "";
      let currentText = "";
      let stop = false;

      /**
       * JSON解析器 - 处理流式JSON数据
       */
      const jsonParser = async ({
        value,
      }: {
        value: string;
        done: boolean;
      }) => {
        currentText += value;
        const { parsedResponse, remainingText } = tryParse(currentText);

        if (parsedResponse) {
          currentText = remainingText;
          // 处理每个解析出的响应片段
          for (const item of parsedResponse) {
            const text = item.candidates[0].content.parts[0].text;
            result += text;
            
            // 更新消息列表中的最后一条消息
            this.messageList = this.messageList.map((message, index) => {
              if (index === this.messageList.length - 1) {
                return { ...message, ...{ content: result } };
              } else {
                return message;
              }
            });

            // 检查是否结束
            if (value.endsWith("]")) {
              stop = true;
            }
            
            // 调用生成中回调
            this.onGenerating && this.onGenerating(result);
          }
        }

        // 完成或停止时调用完成回调
        if (parsedResponse === null || stop) {
          this.onComplete && this.onComplete(result);
        }
      };

      // 读取流式数据
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const text = new TextDecoder().decode(value);
        jsonParser({ value: text, done });
      }
    } catch (error) {
      this.onError && this.onError("Gemini请求失败");
    }
  }

  /**
   * 清空消息历史并中断当前请求
   */
  clearMessage() {
    this.controller.abort("卡片已隐藏");
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
    this.controller.abort("卡片已隐藏");
  }
}
