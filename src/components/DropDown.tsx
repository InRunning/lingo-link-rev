/**
 * 通用下拉菜单组件
 * - 提供可复用的下拉菜单功能
 * - 支持自定义触发器和菜单内容
 * - 自动处理点击外部关闭逻辑
 * - 支持可选的自动关闭行为
 */
import { useEffect, useRef, useState } from "react";

/**
 * 下拉菜单组件
 * @param props - 组件属性
 * @param props.content - 下拉菜单内容
 * @param props.trigger - 触发下拉菜单显示的元素
 * @param props.onTriggerClick - 触发器点击回调（可选）
 * @param props.autoClose - 点击菜单内容时是否自动关闭（默认为true）
 * @returns 下拉菜单React组件
 */
export default function DropDown({
  content,
  trigger,
  onTriggerClick,
  autoClose=true
}: {
  trigger: React.ReactNode;
  content: React.ReactNode;
  onTriggerClick?: (e:React.MouseEvent) =>void
  autoClose?:boolean
}) {
  // ===================== 状态管理 =====================

  /** 下拉菜单显示状态 */
  const [isOpen, setIsOpen] = useState(false);
  
  /** 组件容器引用，用于检测点击外部 */
  const wrapper = useRef<HTMLSpanElement>(null);

  // ===================== 事件处理 =====================

  /**
   * 监听文档点击事件，实现点击外部自动关闭功能
   * - 当点击组件外部时，自动关闭下拉菜单
   * - 使用事件委托，避免内存泄漏
   */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // 检查点击是否在组件容器外部
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) {
        setIsOpen(false);  // 关闭下拉菜单
      }
    };

    // 绑定全局点击事件监听器
    document.addEventListener("click", handleClick);
    
    // 清理函数：组件卸载时移除事件监听器
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);  // 空依赖数组，只在组件挂载和卸载时执行

  // ===================== 渲染逻辑 =====================

  return (
    <span ref={wrapper} className="inline-block relative">
      {/* 触发器：点击后切换下拉菜单状态 */}
      <div
        onClick={(e) => {
          // 执行自定义触发器点击回调
          onTriggerClick && onTriggerClick(e);
          // 切换下拉菜单显示状态
          setIsOpen(!isOpen)
        }}
      >
        {trigger}
      </div>

      {/* 下拉菜单内容：只在isOpen为true时显示 */}
      {isOpen && (
        <div
          onClick={()=>{
            // 如果启用自动关闭，则点击菜单内容后关闭下拉菜单
            if (autoClose) {
              setIsOpen(!isOpen)
            }
          }}
        >
          {content}
        </div>
      )}
    </span>
  );
}
