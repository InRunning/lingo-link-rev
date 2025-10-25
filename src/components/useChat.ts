/**
 * 聊天功能自定义Hook
 *
 * 功能概述：
 * - 封装聊天和翻译功能的通用逻辑
 * - 管理聊天实例的生命周期和状态
 * - 提供统一的接口给React组件使用
 * - 集成错误边界处理和状态管理
 *
 * 主要功能：
 * 1. 根据引擎类型动态创建聊天实例
 * 2. 管理加载、生成、错误等状态
 * 3. 维护消息历史列表
 * 4. 提供实时翻译结果
 * 5. 集成错误边界处理
 */
import { useEffect, useState, useRef } from "react";
import { Message } from "@/types/chat";
import { useErrorBoundary } from "react-error-boundary";
import type { Chat } from "@/types/chat";
import { EngineValue } from "@/types";
import { ChatConstructor } from "@/api/openAI";
import { getChat } from "@/api/chat";

/**
 * useChat Hook参数接口
 */
export interface UseChatParams {
  preMessageList?: Message[];     // 预加载的消息列表
  parentMessageId?: string;       // 父消息ID（用于对话树）
  conversationId?: string;        // 对话会话ID
  engine: EngineValue;           // 使用的翻译/聊天引擎
}

/**
 * useChat Hook返回值接口
 */
export interface UseChatReturn {
  loading: boolean;               // 是否正在加载
  generating: boolean;            // 是否正在生成回复
  chatInstance: Chat | null;      // 聊天实例引用
  translateResult: string;        // 翻译结果
  messageList: Message[];         // 消息列表
}

/**
 * 聊天功能自定义Hook
 * @param params Hook参数
 * @returns 聊天状态和方法
 */
export default function useChat({
  preMessageList,
  parentMessageId,
  conversationId,
  engine,
}: UseChatParams): UseChatReturn {
  // 状态管理
  const [loading, setLoading] = useState(false);                    // 加载状态
  const [generating, setGenerating] = useState(false);              // 生成状态
  const [messageList, setMessageList] = useState<Message[]>(        // 消息列表
    preMessageList ?? []
  );
  const [translateResult, setTranslateResult] = useState("");       // 翻译结果

  // 实例引用
  const chatInstance = useRef<Chat | null>(null);                   // 聊天实例

  // 错误边界处理
  const { showBoundary } = useErrorBoundary();

  /**
   * 初始化聊天实例
   * 当参数发生变化时重新创建聊天实例
   */
  useEffect(() => {
    // 更新消息列表（如果有预加载数据）
    preMessageList && setMessageList(preMessageList);

    // 配置聊天选项
    const chatOptions: ChatConstructor = {
      preMessageList: preMessageList ?? [],  // 预加载消息列表
      onBeforeRequest() {                    // 请求前回调
        setLoading(true);
      },
      onComplete: () => {                    // 完成回调
        setGenerating(false);
        setLoading(false);
      },
      onGenerating(result) {                 // 生成中回调
        setGenerating(true);
        setLoading(false);
        setTranslateResult(result);
        
        // 更新消息列表（如果聊天实例存在）
        chatInstance.current &&
          setMessageList(chatInstance.current.messageList);
      },
      onError(err) {                         // 错误回调
        setGenerating(false);
        setLoading(false);
        showBoundary(err);
      },
    };

    // 根据引擎类型获取聊天类
    const chatClass = getChat(engine);
    if (!chatClass) {
      return; // 引擎不存在，退出
    }

    // 创建新的聊天实例
    chatInstance.current = new chatClass(chatOptions);
  }, [preMessageList, conversationId, parentMessageId, engine]);

  // 返回状态和方法
  return {
    loading,               // 是否正在加载
    generating,            // 是否正在生成回复
    chatInstance,          // 聊天实例引用
    translateResult,       // 翻译结果
    messageList,           // 消息列表
  };
}
