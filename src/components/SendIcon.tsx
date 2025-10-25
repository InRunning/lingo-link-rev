/**
 * 发送按钮图标组件
 * - 渲染发送箭头的SVG图标
 * - 支持自定义CSS类名
 * - 使用Lucide图标的设计风格
 * - 响应式设计，适配不同尺寸
 */
export default function ({className}: {className?: string}) {
  return (
    <svg
      className={`${className}`}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"  // 无障碍访问：隐藏装饰性图标
    >
      {/* 发送箭头的主线 */}
      <line x1="22" x2="11" y1="2" y2="13"/>
      {/* 发送箭头的多边形部分 */}
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}