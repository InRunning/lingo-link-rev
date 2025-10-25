/**
 * 工具函数：翻译功能统一接口
 * - 支持多种翻译引擎的统一调用接口
 * - 包括传统翻译服务（Google、有道、DeepLX）和AI引擎
 * - 提供流式响应支持和完整的错误处理
 * - 统一处理语言设置和文本格式化
 */
import googleTranslate from "@/api/google";
import deepLXTranslate from "@/api/deeplx";
import { getSetting } from "@/storage/sync";
import { defaultSetting } from "./const";
import { formateText } from ".";
import { EngineValue } from "@/types";
import youdaoTranslate from "@/api/youdaoTranslate";
import { getChat } from "@/api/chat";
import type { ChatConstructor } from "@/api/openAI";
import type { Message } from "@/types/chat";
import type { Chat } from "@/types/chat";

/**
 * 构建AI翻译的预定义消息列表
 * - 用于AI引擎的翻译提示和上下文构建
 * - 支持动态替换模板变量：{targetLanguage}、{sentence}
 * - 构建system、assistant、user三段式消息结构
 * @param text - 待翻译的文本
 * @param sentenceSystemPrompt - 系统提示模板
 * @param sentenceUserContent - 用户内容模板
 * @param targetLang - 目标语言
 * @returns Message[] - 预定义消息数组
 */
const getPreMessages = ({
  text,
  targetLang,
  sentenceSystemPrompt,
  sentenceUserContent,
}: {
  text: string;
  sentenceSystemPrompt: string;
  sentenceUserContent: string;
  targetLang: string;
  engine: EngineValue;
}): Message[] => {
  // 替换系统提示中的模板变量
  const rolePrompt = sentenceSystemPrompt
    .replace(/\{targetLanguage\}/g, () => targetLang)  // 替换目标语言
    .replace(/\{sentence\}/g, () => text);           // 替换句子内容
    
  // 替换用户内容中的模板变量
  const contentPrompt = sentenceUserContent
    .replace(/\{targetLanguage\}/g, () => targetLang)
    .replace(/\{sentence\}/g, () => text);

  // 返回三段式消息结构
  return [
    {
      role: "system",     // 系统角色消息，定义AI翻译行为
      content: rolePrompt,
    },
    {
      role: "assistant",  // 助手确认消息
      content: "OK.",
    },
    {
      role: "user",       // 用户翻译请求
      content: contentPrompt,
    },
  ];
};

/**
 * 主翻译函数
 * - 根据引擎类型分发到不同的翻译服务
 * - 统一处理语言设置和响应格式
 * - 支持流式响应和错误处理
 * @param beforeRequest - 请求开始前回调
 * @param onGenerating - 流式生成回调（可选）
 * @param onSuccess - 成功完成回调
 * @param onError - 错误处理回调
 * @param originText - 原始待翻译文本
 * @param engine - 翻译引擎类型
 */
export default async function ({
  beforeRequest,
  onGenerating,
  onSuccess,
  onError,
  originText,
  engine,
}: {
  beforeRequest: () => void;
  onGenerating?: (result: string) => void;
  onSuccess: (result: string, messageList?: Message[]) => void;
  onError: (msg: string) => void;
  originText: string;
  engine: EngineValue;
}) {
  // 文本预处理：格式化待翻译文本
  const text = formateText(originText);
  
  // 获取用户设置
  const setting = await getSetting();
  
  // 获取语言设置（源语言和目标语言）
  const sourceLang =
    setting.sourceLanguage?.language ?? defaultSetting.sourceLanguage.language;
  const targetLang = setting.targetLanguage ?? defaultSetting.targetLanguage;
  
  // 触发请求开始回调
  beforeRequest();

  try {
    // 根据引擎类型分发翻译请求
    switch (engine) {
      // DeepLX翻译服务
      case "deeplx":
        {
          const result = await deepLXTranslate({
            text,
          });
          onSuccess(result!);
        }
        break;
        
      // Google翻译服务
      case "google":
        {
          const googleResult = await googleTranslate({
            text,
            targetLang,  // Google翻译需要目标语言参数
          });
          onSuccess(googleResult);
        }
        break;
        
      // 有道翻译服务
      case "youdao":
        {
          const youdaoResult = await youdaoTranslate({
            text,
            source: sourceLang,  // 有道翻译需要源语言参数
            target: targetLang,  // 有道翻译需要目标语言参数
          });
          onSuccess(youdaoResult);
        }
        break;
        
      // AI引擎处理（默认情况）
      default:
        {
          // 获取对应的聊天类
          const chatClass = getChat(engine);
          if (!chatClass) {
            throw "engine doesn't exist";
          }
          
          // 获取AI翻译的提示模板
          const sentenceSystemPrompt =
            setting.sentenceSystemPrompt ?? defaultSetting.sentenceSystemPrompt;
          const sentenceUserContent =
            setting.sentenceUserContent ?? defaultSetting.sentenceUserContent;
          let chatInstance: Chat | null = null;

          // 配置聊天选项
          const chatOptions: ChatConstructor = {
            preMessageList: getPreMessages({
              text,
              engine,
              targetLang,
              sentenceSystemPrompt,
              sentenceUserContent,
            }),
            onComplete(result) {
              onSuccess(result, chatInstance?.messageList);  // 传递消息列表用于对话
            },
            onGenerating,  // 流式生成回调
            onError,       // 错误处理回调
          };
          
          // 创建聊天实例并发送翻译请求
          chatInstance = new chatClass(chatOptions);
          chatInstance.sendMessage();
        }
        break;
    }
  } catch (error) {
    // 统一错误处理
    onError(error as string);
  }
}
