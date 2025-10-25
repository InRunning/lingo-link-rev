/**
 * 可拖拽翻译卡片包装器组件
 * - 提供可拖拽的浮动翻译卡片容器
 * - 支持用户自由移动和定位翻译结果
 * - 内置设置按钮和关闭按钮
 * - 响应式设计，支持不同的屏幕尺寸
 * - 使用react-draggable实现流畅的拖拽体验
 */
import { X } from "lucide-react";
import Draggable from "react-draggable";
import {
  defaultTranslateWidth,
  defaultTranslateMinHeight,
  defaultTranslateMaxWidth,
} from "@/utils/const";
import { useEffect, useRef } from "react";
import { Settings } from "lucide-react";
import Browser from "webextension-polyfill";
import { ExtensionMessage } from "@/types";

/**
 * 可拖拽包装器组件
 * 创建一个可拖拽的卡片容器，用于显示翻译结果
 * @param props - 组件属性
 * @param props.children - 卡片内容
 * @param props.x - 初始x坐标位置
 * @param props.y - 初始y坐标位置
 * @param props.onmouseenter - 鼠标进入内容区域时的回调
 * @param props.onClose - 关闭卡片的回调函数
 * @returns 可拖拽的卡片React组件
 */
export default function DragableWrapper({
  children,
  x,
  y,
  onmouseenter,
  onClose,
}: {
  children: React.ReactNode;
  x: number;
  y: number;
  onmouseenter: () => void;
  onClose: () => void;
}) {
  // ===================== 引用管理 =====================

  /** Draggable组件的根节点引用 */
  const nodeRef = useRef<HTMLDivElement | null>(null);
  
  /** 卡片内容区域的引用，用于事件监听 */
  const contentRef = useRef<HTMLDivElement | null>(null);

  // ===================== 功能函数 =====================

  /**
   * 打开扩展设置页面
   * 通过向background script发送消息来打开options页面
   */
  const openOption = async () => {
    try {
      const message: ExtensionMessage = { type: "openOptions" };
      await Browser.runtime.sendMessage(message);
    } catch (error) {
      console.log(error);  // 静默处理错误，避免影响用户体验
    }
  };

  // ===================== 事件监听 =====================

  /**
   * 设置鼠标进入事件监听器
   * 当用户鼠标进入卡片内容区域时，触发回调函数
   * 用于实现hover状态管理和交互反馈
   */
  useEffect(() => {
    if (onmouseenter) {
      const contentDom = contentRef.current;
      const handleMouseEnter = () => {
        onmouseenter();  // 执行父组件传入的hover回调
      };
      
      // 添加事件监听器
      contentDom?.addEventListener("mouseenter", handleMouseEnter);
      
      // 清理函数：组件卸载或依赖变化时移除监听器
      return () => {
        contentDom?.removeEventListener("mouseenter", handleMouseEnter);
      };
    }
  }, [onmouseenter]);  // onmouseenter变化时重新设置监听器

  // ===================== 渲染逻辑 =====================

  return (
    <Draggable
      handle=".handle"              // 指定拖拽手柄元素（类名为handle的元素）
      nodeRef={nodeRef}             // 绑定到react-draggable的节点引用
      defaultClassName="chat_cat_dragable"           // 默认样式类
      defaultClassNameDragging="chat_cat_dragable_dragging" // 拖拽中样式类
      defaultClassNameDragged="chat_cat_dragable_dragged"   // 拖拽完成后样式类
    >
      {/* 拖拽容器的实际DOM元素 */}
      <div
        ref={nodeRef}
        style={{
          left: x,                              // 左定位坐标
          top: y,                               // 顶部定位坐标
          width: defaultTranslateWidth,         // 默认宽度
          maxWidth: defaultTranslateMaxWidth,   // 最大宽度限制
          minHeight: defaultTranslateMinHeight, // 最小高度
          padding: 16,                          // 内边距
        }}
        className={`group absolute bg-inherit max-h-[100vh] p-[5px] flex flex-col  rounded-xl shadow-[0_0_16px_0px_rgba(0,0,0,0.2)] text-[14px]  overflow-hidden z-[2147483647]`}
      >
        {/*
          备用拖拽手柄（已注释）
          原本用于显示拖拽图标，现在使用透明区域作为手柄
          <GripHorizontal
            className="handle opacity-0 group-hover:opacity-50 z-10"
            style={{
              position: "absolute",
              left: "50%",
              top: "-6px",
              transform: "translateX(-50%)",
              width: "38px",
              height: "38px",
              boxSizing: "border-box",
              cursor: "move",
              padding: "2px 10px",
            }}
          />
        */}
        
        {/* 透明拖拽手柄区域 - 整个顶部30px区域都可以拖拽 */}
        <div className="handle z-10 absolute left-0 top-0 bg-transparent w-full h-[30px]"></div>
        
        {/* 右上角操作按钮区域 */}
        <div className="flex items-center absolute right-1 top-1 z-10">
          {/* 设置按钮 - 点击打开扩展设置页面 */}
          <Settings
            onClick={openOption}
            className="cursor-pointer  w-[24px] h-[24px] p-[4px]"
            title="打开设置"  // 鼠标悬停时显示提示
          />
          {/* 关闭按钮 - 点击关闭翻译卡片 */}
          <X
            onClick={onClose}
            className="cursor-pointer  w-[24px] h-[24px] p-[4px]"
            title="关闭"  // 鼠标悬停时显示提示
          />
        </div>
        
        {/* 卡片内容区域 */}
        <div className="text" ref={contentRef}>
          {children}  {/* 渲染传入的子组件内容 */}
        </div>
      </div>
    </Draggable>
  );
}
