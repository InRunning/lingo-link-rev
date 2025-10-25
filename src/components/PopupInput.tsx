/**
 * 弹窗输入框组件
 * - 专为popup弹窗设计的输入组件
 * - 支持自适应高度调整（最小1行，最大150px）
 * - 自动填充页面选中的文本内容
 * - 支持Enter发送、Shift+Enter换行
 * - 内置提交按钮，支持点击和键盘操作
 * - 自动获取页面文本选择信息
 */
import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { getWindowSelectionInfo } from "@/utils";

/**
 * 弹窗输入框组件
 * 为popup窗口提供智能的文本输入体验
 * @param props - 组件属性
 * @param props.onSubmit - 文本提交回调函数
 * @param props.placeholder - 占位符文本（可选）
 * @returns 智能输入框React组件
 */
export default function PopupInput({
  onSubmit,
  placeholder,
}: {
  onSubmit: (msg: string) => void;
  placeholder?: string;
}) {
  // ===================== 状态管理 =====================

  /** 输入文本值 */
  const [value, setValue] = useState("");
  
  /** 文本域引用，用于DOM操作和高度调整 */
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ===================== 事件处理函数 =====================

  /**
   * 处理文本提交
   * - 过滤空内容
   * - 调用提交回调函数
   * - 保留输入内容（不自动清空）
   */
  const handleSubmit = () => {
    if (value.trim() === "") return;  // 空内容不提交
    onSubmit(value.trim());           // 调用外部提交函数
    // setValue("");                   // 注释：保留输入内容
  };

  /**
   * 处理文本变化
   * - 阻止事件冒泡
   * - 更新输入值状态
   * @param event - 文本变化事件
   */
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();  // 防止事件冒泡
    const newValue = event.target.value;
    setValue(newValue);
  };

  /**
   * 处理键盘按键事件
   * - Enter + Shift: 换行
   * - Enter (无Shift): 提交
   * @param event - 键盘事件
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();  // 防止事件冒泡
    
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();  // 阻止Enter换行行为
      handleSubmit();          // 执行提交
    }
  };

  // ===================== 初始化和高度调整 =====================

  /**
   * 初始化：获取页面选中文本
   * 组件挂载时自动获取当前页面选中的文本内容
   */
  useEffect(() => {
    getWindowSelectionInfo().then(res => {
      // 检查返回结果是否为有效对象且包含word字段
      if ((typeof res === 'object') && res !== null && 'word' in res) {
        setValue(res.word as string);  // 自动填充选中内容
      }
    });
  }, []);

  /**
   * 自适应高度调整Effect
   * - 根据内容长度动态调整文本域高度
   * - 最小高度：自动适应
   * - 最大高度：150px，超出时显示滚动条
   */
  useEffect(() => {
    if (textareaRef.current) {
      if (value) {
        // 有内容时：重置高度为auto，然后设置为实际内容高度
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
        
        // 如果内容高度超过150px，显示滚动条
        if (textareaRef.current.scrollHeight > 150) {
          textareaRef.current.style.overflowY = "scroll";
        } else {
          textareaRef.current.style.overflowY = "hidden";
        }
      } else {
        // 空内容时：重置高度为自动适应
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.overflowY = "hidden";
        // textareaRef.current.style.height = `24px`;  // 注释：原始固定高度
      }
    }
  }, [value]);

  /**
   * 引擎智能提交逻辑（已注释）
   * 原本根据不同引擎类型自动提交或显示提交按钮的逻辑
   * 现已简化，直接由用户手动提交
   */
  // useEffect(() => {
  //   if (!value.trim()){return}
  //   if (isWord({input:value, lang: setting.sourceLanguage?.language})) {
  //     if (lastEngine === null){
  //       if (setting.wordEngineList && !setting.wordEngineList[0].isChat) {
  //         onSubmit(value.trim());
  //         setShowSubmitBtn(false)
  //       }
  //       return
  //     }
  //     if (lastEngine === 'google' || lastEngine === 'youdao' || lastEngine === 'collins' || lastEngine === 'deeplx') {
  //       onSubmit(value.trim());
  //       setShowSubmitBtn(false)
  //     } else {
  //       setShowSubmitBtn(true)
  //     }
  //   } else {
  //     if (lastEngine === null){
  //       if (setting.sentenceEngineList && !setting.sentenceEngineList[0].isChat) {
  //         onSubmit(value.trim());
  //         setShowSubmitBtn(false)
  //       }
  //       return
  //     }
      
  //     if (lastEngine === 'google' || lastEngine === 'youdao' || lastEngine === 'collins' || lastEngine === 'deeplx') {
  //       onSubmit(value.trim());
  //       setShowSubmitBtn(false)
  //     } else {
  //       setShowSubmitBtn(true)
  //     }
  //   }
  // }, [lastEngine,value,onSubmit,setting.sourceLanguage?.language,setting.wordEngineList,setting.sentenceEngineList])

  // ===================== 渲染逻辑 =====================

  return (
    <div className={`relative text-[14px] transition rounded-md`}>
      {/* 主要输入区域 */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ? placeholder : ""}
        className="border border-slate-300 rounded-md leading-5 w-full outline-none focus:outline-none p-[4px] m-0"
        autoFocus  // 自动获取焦点
      />
      
      {/* 提交按钮（仅在有内容时显示） */}
      {value && (
        <div onClick={handleSubmit} className="flex flex-row-reverse">
          <button className="btn btn-xs gap-1">
            <Send className="w-3" />
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
