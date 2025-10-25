/**
 * 图片上传预览组件
 * - 提供固定尺寸的图片预览界面
 * - 支持上传和删除功能
 * - 鼠标悬停显示删除按钮
 * - 响应式设计，适配不同容器
 * - 使用Lucide图标库提供UI图标
 */
import { PlusSquare, X } from "lucide-react";

/**
 * 图片上传预览组件
 * 创建一个固定尺寸的图片预览容器，支持上传和删除操作
 * @param props - 组件属性
 * @param props.src - 可选的图片源地址
 * @param props.onclose - 可选的图片删除回调函数
 * @returns 图片预览React组件
 */
export default function ImgUploaderPreview({
  src,
  onclose
}: {
  src?: string;
  onclose?: () => void;
}) {
  return (
    <div className="group relative w-[70px] h-[70px]">
      {/* 删除按钮 - 鼠标悬停时显示 */}
      <div
        onClick={(e) => {
          e.stopPropagation();  // 防止事件冒泡
          onclose && onclose();  // 执行删除回调
        }}
        className="group-hover:block hidden absolute cursor-pointer -right-[6px] -top-[6px] border bg-gray-100 p-1 rounded-full overflow-hidden"
        title="删除图片"  // 鼠标悬停提示
      >
        <X className="w-[12px] h-[12px] opacity-100" />
      </div>
      
      {/* 主容器 - 点击区域 */}
      <div className="cursor-pointer border overflow-hidden rounded-lg w-full h-full">
        {/* 条件渲染：显示图片或上传图标 */}
        {src ? (
          // 有图片时：显示预览图
          <img
            className="w-full h-full object-cover"
            src={src}
            alt=""
          />
        ) : (
          // 无图片时：显示上传图标
          <PlusSquare className="w-full h-full p-2 text-gray-400" />
        )}
      </div>
    </div>
  );
}
