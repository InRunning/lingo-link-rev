/**
 * 单词收集模态框组件
 * - 提供可拖拽的浮动模态框用于单词收集
 * - 支持居中显示和自定义拖拽定位
 * - 内置关闭按钮和顶部拖拽区域
 * - 适用于复杂表单或内容展示场景
 * - 使用react-draggable实现流畅拖拽体验
 */
import Draggable from "react-draggable";
import { useRef } from "react";
import { X } from "lucide-react";
import { collectShowAtom } from "@/store";
import { useAtom } from "jotai";

/**
 * 单词收集模态框组件
 * 创建一个可拖拽的居中模态框，专门用于单词收集功能
 * @param props - 组件属性
 * @param props.children - 模态框内容（通常是CollectForm组件）
 * @returns 可拖拽的收集模态框React组件
 */
export default function CollectModal({
  children,
}: {
  children: React.ReactElement;
}) {
  // ===================== 引用管理 =====================

  /** Draggable组件的根节点引用 */
  const nodeRef = useRef<HTMLDivElement | null>(null);

  // ===================== 全局状态管理 =====================

  /** 模态框显示状态控制 */
  const [, setCollectShow] = useAtom(collectShowAtom);

  // ===================== 渲染逻辑 =====================

  return (
    <Draggable
      handle=".modal_handle"                          // 指定拖拽手柄类名
      nodeRef={nodeRef}                               // 绑定节点引用
      defaultPosition={{ x: -250, y: -250 }}          // 默认位置（居中偏移）
      defaultClassName="chat_cat_dragable"            // 默认样式类
      defaultClassNameDragging="chat_cat_dragable_dragging" // 拖拽中样式类
      defaultClassNameDragged="chat_cat_dragable_dragged"   // 拖拽完成后样式类
    >
      {/* 模态框主容器 */}
      <div
        ref={nodeRef}
        style={{
          position: "fixed",              // 固定定位
          left: "50%",                    // 水平居中
          top: "50%",                     // 垂直居中
          padding: "20px 20px 20px 20px", // 统一内边距
          borderRadius: "8px",           // 圆角边框
          boxShadow: "0 0 15px rgba(0,0,0,.1)",  // 阴影效果
          width: "540px",                // 固定宽度
          zIndex: 2147483647,           // 最高层级
          backgroundColor: "inherit",    // 继承背景色
          boxSizing: "border-box",       // 盒模型计算方式
        }}
      >
        {/* 顶部拖拽手柄区域 */}
        <div className="modal_handle z-10 absolute left-0 top-0 bg-transparent w-full h-[30px]"></div>
        
        {/* 右上角关闭按钮 */}
        <div className="p-3 absolute z-10 right-0 top-0">
          <X
            onClick={() => {
              setCollectShow(false);  // 关闭模态框
            }}
            className="cursor-pointer w-[18px] h-[18px]"
            title="关闭"  // 鼠标悬停提示
          />
        </div>
        
        {/* 模态框内容区域 */}
        <div>{children}</div>
      </div>
    </Draggable>
  );
}
