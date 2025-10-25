/**
 * 组件：词汇AI对话组件
 * - 专门用于词汇学习的AI对话界面，支持多种AI引擎
 * - 使用forwardRef暴露方法给父组件，支持获取消息列表
 * - 动态生成预定义消息模板，支持系统提示和用户内容
 * - 处理流式响应显示和错误边界
 */
import React, { useEffect, useState, useRef } from "react";
import InputBlink from "./InputBlink";
import { currentSelectionInfo } from "@/utils";
import { EngineValue } from "@/types";
import { getChat } from "@/api/chat";
import type { Chat, Message } from "@/types/chat";
import type { ChatConstructor } from "@/api/openAI";
import { useErrorBoundary } from "react-error-boundary";
import { forwardRef, useImperativeHandle } from "react";

/**
 * WordChat组件参数接口
 */
interface WordChatParams {
  currentEngine: EngineValue;  // 当前AI引擎
  targetLang: string;          // 目标语言
  speaker?: React.ReactNode;   // 可选的语音播放组件
  wordSystemPrompt:string,     // 词汇学习的系统提示模板
  wordUserContent:string,      // 词汇学习的用户内容模板
}

/**
 * 构建预定义消息列表的函数
 * - 替换模板变量：{targetLanguage}、{word}、{sentence}
 * - 构建system、assistant、user三段式消息结构
 * @param wordSystemPrompt - 系统提示模板
 * @param wordUserContent - 用户内容模板
 * @param targetLang - 目标语言
 * @returns Message[] - 预定义消息数组
 */
const getPreMessages = ({
  wordSystemPrompt,
  wordUserContent,
  targetLang,
}: {
  wordSystemPrompt: string;
  wordUserContent: string;
  engine: EngineValue;
  targetLang: string;
}): Message[] => {
  // 替换系统提示中的模板变量
  const rolePrompt = wordSystemPrompt
    .replace(/\{targetLanguage\}/g, ()=> targetLang)  // 替换目标语言
    .replace(/\{word\}/g, ()=> currentSelectionInfo.word)  // 替换选中词汇
    .replace(/\{sentence\}/g, ()=> currentSelectionInfo.context);  // 替换上下文句子
    
  // 替换用户内容中的模板变量
  const contentPrompt = wordUserContent
    .replace(/\{targetLanguage\}/g, ()=> targetLang)
    .replace(/\{word\}/g, ()=> currentSelectionInfo.word)
    .replace(/\{sentence\}/g, ()=> currentSelectionInfo.context);
  
  // 返回三段式消息结构
  return [
    {
      role: "system",  // 系统角色消息，定义AI行为
      content: rolePrompt,
    },
    {
      role: "assistant",  // 助手确认消息
      content: 'OK.',
    },
    {
      role: "user",  // 用户请求消息
      content: contentPrompt,
    },
  ];
};

/**
 * WordChat组件（使用forwardRef暴露方法给父组件）
 * @param props - WordChatParams参数
 * @param ref - 父组件传递的ref，用于暴露方法
 * @returns JSX.Element - WordChat组件渲染结果
 */
export default forwardRef<{getMessageList:()=>Message[]}, WordChatParams>(
   function RenderWordChat(props,ref) {
    const {
      currentEngine,    // 当前AI引擎
      speaker,          // 语音播放组件
      targetLang,       // 目标语言
      wordSystemPrompt, // 系统提示模板
      wordUserContent,  // 用户内容模板
    } = props;
    
    // 错误边界处理
    const { showBoundary } = useErrorBoundary();
    
    // 状态管理
    const [lines, setLines] = useState<string[]>([]);          // 翻译结果行数组
    const [loading, setLoading] = useState(false);             // 初始加载状态
    const [generating, setGenerating] = useState(false);       // 流式生成状态
    const [translateResult, setTranslateResult] = useState(""); // 翻译结果文本
    
    // 聊天实例引用
    const chatInstance = useRef<Chat | null>(null);
    
    /**
     * 向父组件暴露的方法
     * - getMessageList: 获取当前聊天消息列表
     */
    useImperativeHandle(ref, () => ({
      getMessageList: ()=> chatInstance.current?.messageList ?? [],
    }));
    
    /**
     * 翻译结果行分割Effect
     * 将翻译结果按换行符分割为行数组供渲染使用
     */
    useEffect(() => {
      setLines(translateResult.split("\n"));
    }, [translateResult]);
    
    /**
     * 初始化聊天实例Effect
     * 当引擎、模板或目标语言变化时重新初始化聊天
     */
    useEffect(() => {
      // 构建预定义消息列表
      const preMessages = getPreMessages({
        engine: currentEngine,
        targetLang,
        wordSystemPrompt,
        wordUserContent,
      });
      
      // 获取对应的聊天类
      const chatClass = getChat(currentEngine);
      if (!chatClass) {
        return;  // 如果没有找到对应的聊天类，直接返回
      }
      
      // 如果当前实例已经是目标类，无需重新创建
      if (chatInstance.current instanceof chatClass) {
        return;
      }
  
      // 配置聊天选项
      const chatOptions: ChatConstructor = {
        preMessageList: preMessages,  // 预定义消息列表
        onBeforeRequest: () => {
          setLoading(true);  // 请求开始前显示加载状态
        },
        onComplete: () => {
          setGenerating(false);  // 完成时停止生成状态
          setLoading(false);     // 停止加载状态
        },
        onGenerating(result) {
          setGenerating(true);   // 开始流式生成
          setLoading(false);     // 停止初始加载
          setTranslateResult(result); // 更新翻译结果
        },
        onError(err) {
          setGenerating(false);  // 发生错误时停止生成
          setLoading(false);     // 停止加载
          showBoundary(err);     // 显示错误信息
        },
      };
  
      // 创建新的聊天实例
      chatInstance.current = new chatClass(chatOptions);
      // 发送初始消息（触发AI响应）
      chatInstance.current.sendMessage();
    }, [currentEngine,showBoundary,wordSystemPrompt,wordUserContent,targetLang]);
    
    // const refresh = () => {  // 刷新功能（已注释）
    //   console.log(chatInstance.current?.messageList);
    // }
    
    /**
     * 加载中状态显示
     * 显示骨架屏占位内容
     */
    if (loading) {
      return (
        <div className="flex flex-col gap-2 w-full">
          <div className="skeleton h-4 w-28"></div>
          <div className="skeleton h-4 w-full"></div>
          <div className="skeleton h-4 w-full"></div>
        </div>
      );
    }
    
    /**
     * 主要渲染内容
     * 包含语音播放组件和AI回复的逐行显示
     */
    return (
      <div>
        {/* 语音播放组件 */}
        {speaker}
        
        {/* AI回复内容逐行显示 */}
        {lines.map((line, index) => (
          <p className="flex items-center" key={index}>
            {/* 文本行内容 */}
            {line}
            {/* 在最后一行且正在生成时显示加载动画 */}
            {generating && index === lines.length - 1 && <InputBlink />}
          </p>
        ))}
      </div>
    );
  }
)

