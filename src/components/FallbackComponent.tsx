/**
 * 错误边界回退组件
 * - 作为React Error Boundary的错误显示组件
 * - 提供用户友好的错误信息和恢复机制
 * - 支持ref接口进行程序化错误清除
 * - 支持国际化错误信息显示
 * - 使用forwardRef暴露内部方法给父组件
 */
import type { FallbackProps } from "react-error-boundary";
import { useErrorBoundary } from "react-error-boundary";
import { RotateCcw } from "lucide-react";
import { forwardRef, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";

/**
 * 错误回退组件属性接口
 */
interface FallbackComponentProps {
  /** Error Boundary提供的错误回退属性 */
  fallbackProps: FallbackProps;
  /** 可选的额外CSS类名 */
  className?: string;
}

/**
 * 错误回退组件暴露的ref接口
 */
interface FallbackImperative {
  /** 隐藏/清除错误的函数 */
  hideError: () => void;
}

/**
 * 错误边界回退组件
 * 使用forwardRef暴露内部方法，提供优雅的错误处理体验
 * @param props - 组件属性
 * @param ref - ref接口，用于暴露内部方法
 * @returns 错误回退React组件
 */
export default forwardRef<FallbackImperative, FallbackComponentProps>(
  function FallbackComponent(props, ref) {
    // ===================== 国际化支持 =====================

    /** React-i18next翻译函数 */
    const { t } = useTranslation();

    // ===================== 错误边界处理 =====================

    /** 错误边界重置函数 */
    const { resetBoundary } = useErrorBoundary();

    /**
     * 处理错误重置
     * 调用Error Boundary的resetBoundary来恢复错误状态
     */
    const handleReset = () => {
      resetBoundary();
    };

    // ===================== Ref接口暴露 =====================

    /**
     * 暴露内部方法给父组件
     * 通过useImperativeHandle向ref暴露hideError方法
     */
    useImperativeHandle(ref, () => ({
      hideError: handleReset,  // 暴露错误重置方法
    }));

    // ===================== 渲染逻辑 =====================

    return (
      <div
        className={`w-full absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-red-500 text-center py-2 ${props.className}`}
      >
        {/* 错误信息显示区域 */}
        <div>
          {/* 错误标识和国际化错误信息 */}
          <span>Error：</span>
          <span>{t(props.fallbackProps.error)}</span>
        </div>

        {/* 重置按钮 */}
        <button
          className="btn ml-1 btn-square btn-xs btn-ghost"
          onClick={handleReset}
          title="重试"  // 鼠标悬停提示
        >
          <RotateCcw className="w-[16px] h-[16px]" />
        </button>
      </div>
    );
  }
);
