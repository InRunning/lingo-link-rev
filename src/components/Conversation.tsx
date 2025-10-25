/**
 * 组件：对话聊天窗口
 * - 显示与AI引擎的对话记录，支持多种AI引擎（Gemini、DeepSeek、文心一言等）
 * - 使用自定义Hook useChat管理对话状态和消息流
 * - 实时显示用户和AI的消息，支持流式响应
 * - 包含消息渲染、输入框、关闭按钮等交互元素
 */
import ChatInput from "@/components/ChatInput";
import type { Message } from "@/types/chat";
import InputBlink from "./InputBlink";
import useChat from "./useChat";
import GeminiClass from "@/api/gemini";
import { EngineValue } from "@/types";

/**
 * Conversation组件参数接口
 * @param preMessageList - 预加载的消息列表
 * @param parentMessageId - 父消息ID，用于消息线程
 * @param conversationId - 对话会话ID
 * @param className - 自定义CSS类名
 * @param onClose - 关闭对话框回调函数
 * @param engine - 当前使用的AI引擎
 */
export default function Conversation ({
  preMessageList,
  parentMessageId,
  conversationId,
  className,
  onClose,
  engine
}: {
  preMessageList: Message[];
  className?: string;
  parentMessageId?: string | undefined;
  conversationId?: string | undefined;
  onClose?:()=>void;
  engine:EngineValue
}) {
  // 使用useChat Hook管理聊天状态和消息
  const { messageList, loading, chatInstance } = useChat({
    preMessageList,
    parentMessageId,
    conversationId,
    engine
  });
  
  /**
   * 处理用户发送消息的函数
   * @param content - 用户输入的文本内容
   */
  const handleRequest = (content: string) => {
    chatInstance.current?.sendMessage(content);
    // 以下代码用于自动滚动到最新消息（已注释，可能需要时启用）
    // const messageWrapperDom = messagesWrapper.current
    // setTimeout(() => {
    //   if (
    //     messageWrapperDom.scrollHeight -
    //       messageWrapperDom.scrollTop -
    //       messageWrapperDom.clientHeight >
    //     50
    //   ) {
    //     messagesWrapper.current.scrollTop = messagesWrapper.current.scrollHeight
    //   }
    // }, 100)
  };

  /**
   * 渲染消息列表，过滤掉Gemini引擎的前两条消息（通常是系统消息）
   * @param chatInstance instanceof GeminiClass - 判断是否为Gemini引擎
   * @returns 过滤后的消息列表
   */
  const renderMessageList = messageList.filter(
    (_item,index) => chatInstance.current instanceof GeminiClass ? (index !== 0 && index !==1 ) : index !== 0
  );
  
  return (
    <div
      className={`overflow-auto pt-3 right-0 w-[400px] flex flex-col ${className}`}
    >
      {/* 关闭按钮 */}
      <button onClick={onClose} className="absolute left-2 top-2 btn btn-circle btn-xs z-10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      
      {/* 消息显示区域 */}
      <div className="grow overflow-hidden">
        <div
          className={`cat_message_wrapper space-y-3 px-2 py-2 h-full overflow-y-scroll`}
        >
          {renderMessageList.map((item, index) => {
            return (
              <div
                className={`flex ${
                  item.role === "user" ? "justify-end" : "justify-start"
                }`}
                key={index}
              >
                {/*
                <RenderOpenAiResult
                  loading={loading && index === renderMessageList.length - 1}
                  result={item.content}
                  role={item.role}
                  isError={item.isError}
                ></RenderOpenAiResult>
                */}
                <div
                  className={`${
                    item.role === "user"
                      ? "bg-neutral text-neutral-content rounded-br-md"
                      : "bg-neutral text-neutral-content rounded-tl-md"
                  } ${
                    item.isError ? "text-error-content" : ""
                  } group rounded-3xl  px-4 py-3 relative shadow break-words min-w-0`}
                >
                  {/* 显示消息内容 */}
                  {item.content}
                  {/* 显示加载动画（仅在最后一条消息且正在加载时） */}
                  {loading && index === renderMessageList.length - 1 && (
                    <InputBlink />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 输入框区域 */}
      <div className="shrink-0">
        <ChatInput onSubmit={handleRequest} placeholder=""></ChatInput>
      </div>
    </div>
  );
}
