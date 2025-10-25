/**
 * 内容折叠显示组件
 * - 智能检测内容高度并自动添加展开/收起功能
 * - 支持自定义行数限制，默认5行后显示"更多"
 * - 使用WebKit的LineClamp实现行数限制
 * - 提供流畅的内容切换体验
 * - 适用于长文本内容的展示优化
 */
import { useEffect, useRef, useState } from "react";

/**
 * 内容折叠显示组件
 * 自动检测内容是否超过指定行数，如果超过则显示"更多"按钮
 * @param props - 组件属性
 * @param props.children - 需要显示的内容
 * @param props.lines - 限制的行数（默认5行）
 * @returns 智能折叠显示的React组件
 */
export default function ContentMore({
  children,
  lines = 5,
}: {
  children: React.ReactNode;
  lines?: number;
}) {
  // ===================== 引用和状态管理 =====================

  /** 内容容器引用，用于检测高度 */
  const contentRef = useRef<HTMLDivElement>(null);
  
  /** 是否显示"更多"按钮的状态 */
  const [showMore, setShowMore] = useState(false);

  // ===================== 高度检测逻辑 =====================

  /**
   * 检测内容高度并决定是否显示"更多"按钮
   * - 使用getComputedStyle获取计算后的样式
   * - 对比实际高度与预期行数高度
   * - 当内容高度超过限制时显示"更多"按钮
   */
  useEffect(() => {
    if (!contentRef.current) {
      return;  // 元素未准备好，跳过检测
    }

    const style = window.getComputedStyle(contentRef.current);
    const lineHeight = style.lineHeight;  // 获取行高

    // 计算内容总高度是否超过限制
    const contentHeight = contentRef.current.scrollHeight;
    const maxHeight = parseFloat(lineHeight) * lines;

    if (contentHeight > maxHeight) {
      setShowMore(true);  // 超出限制，显示"更多"按钮
    } else {
      // setShowMore(true);  // 原始代码中的备用逻辑（目前被注释）
    }
  }, [children, lines]);  // 依赖内容或行数变化时重新检测

  // ===================== 渲染逻辑 =====================

  return (
    <>
      {/* 内容容器 */}
      <div
        style={{
          // WebKit专用的行数限制属性
          WebkitLineClamp: showMore ? lines : 'unset',  // 超出时限制行数，否则不限制
          display: '-webkit-box',                       // 弹性盒子布局
          WebkitBoxOrient: 'vertical',                  // 垂直方向排列
          overflow: "hidden"                           // 隐藏超出内容
        }}
        ref={contentRef}
      >
        {children}
      </div>
      
      {/* "更多"按钮（仅在需要时显示） */}
      {showMore ? (
        <div
          onClick={() => setShowMore(false)}
          className="text-blue-500 cursor-pointer"
          title="展开显示全部内容"
        >
          show more
        </div>
      ) : null}
    </>
  );
}
