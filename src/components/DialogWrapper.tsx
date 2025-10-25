/**
 * 对话框包装器组件
 * - 提供标准化的HTML5 dialog元素封装
 * - 支持自定义ID和多种尺寸样式
 * - 内置关闭按钮和键盘ESC支持
 * - 最高层级显示，适用于重要信息展示
 * - 提供全局显示/隐藏函数接口
 */
export default function DialogWrapper({
  children,
  id
}: {
  children: React.ReactElement;
  id?: string;
}) {
  return (
    <dialog
      id={`${id ? id : 'dialog_wrapper'}`}
      className="modal z-[2147483647]"
    >
      <div className="relative modal-box max-w-[600px]">
        {/* 预留的加载状态显示区域（已注释） */}
        {/* {loadingShow && (
          <div className="z-10 absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className="loading loading-spinner loading-md text-neutral"></span>
          </div>
        )} */}

        {/* 对话框关闭按钮区域 */}
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-[5px] top-[5px] outline-none">
            ✕
          </button>
        </form>

        {/* 对话框内容 */}
        {children}
      </div>
    </dialog>
  );
}

/**
 * 显示对话框的全局函数
 * 通过DOM操作打开指定ID的对话框模态框
 * @param id - 可选的对话框ID（不提供则使用默认ID）
 */
export const showDialog = (id?: string) => {
  const dialogElement = document.querySelector(`#${typeof id === 'string' ? id : 'dialog_wrapper'}`) as HTMLDialogElement;
  dialogElement?.showModal();  // 显示模态对话框
};

/**
 * 隐藏对话框的全局函数
 * 通过DOM操作关闭指定ID的对话框
 * @param id - 可选的对话框ID（不提供则使用默认ID）
 */
export const hideDialog = (id?: string) => {
  const dialogElement = document.querySelector(`#${typeof id === 'string' ? id : 'dialog_wrapper'}`) as HTMLDialogElement;
  dialogElement?.close();  // 关闭模态对话框
};