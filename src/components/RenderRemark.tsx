/**
 * 组件：备注内容渲染组件
 * - 专门用于渲染用户添加的笔记内容和图片
 * - 支持条件渲染：如果没有内容则返回null
 * - 智能布局：文本内容在上，图片在下
 * - 限制图片最大宽度，避免影响页面布局
 */
export default function RenderRemark({
  content,
  imgs,
}: {
  content?: string;  // 备注文本内容
  imgs?: string[];   // 备注图片URL数组
}) {
  /**
   * 空内容检查
   * - 如果既没有文本内容也没有图片，返回null不渲染任何内容
   * - 如果有文本或图片中的一种，继续渲染
   */
  if (!content && imgs && imgs.length === 0) {
    return null;
  }
  
  /**
   * 渲染备注内容
   * - 文本内容：可选渲染，如果有内容则显示在独立的div中
   * - 图片内容：可选渲染，如果有图片则逐个渲染并限制最大宽度
   */
  return (
    <div className="text-sm my-3">
      {/* 文本内容渲染 */}
      {content ? <div className="mb-2">{content}</div> : null}
      
      {/* 图片内容渲染 */}
      {imgs && imgs.length ? (
        imgs.map((img,index) => (
          <img
            key={index}
            className="max-w-[300px]"
            src={img}
            alt={`备注图片 ${index + 1}`}
          />
        ))
      ) : null}
    </div>
  );
}
