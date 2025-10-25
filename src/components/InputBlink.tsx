/**
 * 组件：输入闪烁动画组件
 * - 显示类似文本输入光标的闪烁效果
 * - 用于在AI生成内容时显示加载状态
 * - 使用CSS动画实现闪烁效果
 * - 小尺寸设计，适合嵌入到文本行中
 */
export default function InputBlink () {
  return (
    <span className="animate-blink inline-block align-middle w-2 h-4 bg-base-content ml-1 mb-[2px]"></span>
  )
}