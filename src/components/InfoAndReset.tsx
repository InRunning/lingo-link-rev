/**
 * 信息提示和重置操作组件
 * - 提供两种功能：信息提示下拉菜单和重置确认对话框
 * - 集成国际化支持，显示多语言提示信息
 * - 支持键盘和鼠标操作，提供良好的用户体验
 * - 使用Tailwind CSS实现响应式布局
 * - 双下拉菜单设计，功能明确分离
 */
import { useTranslation } from "react-i18next";
import { Info, RotateCw } from "lucide-react";

/**
 * 信息提示和重置组件
 * 提供信息展示和重置确认功能的组合组件
 * @param props - 组件属性
 * @param props.tip - 信息提示的内容文本
 * @param props.onReset - 重置操作的回调函数
 * @returns 包含信息提示和重置确认的React组件
 */
export default function InfoAndReset({
  tip,
  onReset
}: {
  tip: string;
  onReset: () => void;
}) {
  // ===================== 国际化支持 =====================

  /** React-i18next翻译函数 */
  const { t } = useTranslation();

  // ===================== 事件处理函数 =====================

  /**
   * 关闭确认对话框
   * - 移除当前活动的焦点元素
   * - 用于在用户操作后关闭下拉菜单
   */
  const closeConfirm = () => {
    (document.activeElement as HTMLElement).blur();
  };

  // ===================== 渲染逻辑 =====================

  return (
    <>
      {/* 信息提示下拉菜单 */}
      <div className="dropdown">
        {/* 信息图标触发按钮 */}
        <div
          tabIndex={0}
          role="button"
          className="btn btn-circle btn-ghost btn-xs text-info outline-none"
          title="信息提示"  // 鼠标悬停提示
        >
          <Info className="w-[14px] h-[14px]" />
        </div>
        
        {/* 信息内容下拉框 */}
        <div
          tabIndex={0}
          className="dropdown-content z-[1] bg-base-200 rounded-md w-[320px]"
        >
          <div tabIndex={0} className="p-2 text-sm">
            <p>{tip}</p>  {/* 显示传入的提示文本 */}
          </div>
        </div>
      </div>

      {/* 重置确认下拉菜单 */}
      <div className="dropdown">
        {/* 重置图标触发按钮 */}
        <div
          tabIndex={0}
          role="button"
          className="btn btn-circle btn-ghost btn-xs text-info outline-none"
          title="重置确认"  // 鼠标悬停提示
        >
          <RotateCw className="w-[14px] h-[14px]" />
        </div>
        
        {/* 重置确认对话框 */}
        <div
          tabIndex={0}
          className="dropdown-content card card-compact w-[170px] bg-base-200 text-base-content text-xs"
        >
          <div className="card-body items-center text-center">
            {/* 确认问题文本 */}
            <p className="text-[13px]">{t('Confirm Question')}</p>
            
            {/* 操作按钮区域 */}
            <div className="card-actions justify-end">
              {/* 取消按钮 */}
              <button
                onMouseDown={closeConfirm}
                className="btn btn-xs btn-primary"
              >
                {t('Cancel')}
              </button>
              
              {/* 确认按钮 */}
              <button
                onClick={() => {
                  closeConfirm();  // 先关闭对话框
                  onReset();       // 执行重置操作
                }}
                className="btn btn-xs btn-ghost"
              >
                {t('Confirm')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}