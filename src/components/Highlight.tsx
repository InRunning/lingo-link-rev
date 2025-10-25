/**
 * 组件：文本高亮显示组件
 * - 在给定的上下文句子中高亮显示指定的词汇
 * - 支持多个词汇的并行高亮显示
 * - 自动处理大小写不敏感的匹配
 * - 限制上下文长度，避免过长文本影响显示
 * - 使用React.memo优化性能，避免不必要的重渲染
 */
import { memo } from "react"

export default memo(function HighLight({
  wordString,
  context,
  highlightClassName
}: {
  wordString: string;        // 词汇JSON字符串，如'["word1", "word2"]'
  context: string;           // 上下文句子
  highlightClassName?: string; // 自定义高亮CSS类名
}) {
  /**
   * 限制上下文长度
   * 如果上下文超过200个字符，则截断并添加省略号
   */
  const restrictedContext = context.length > 200 ? context.slice(0, 200) + '...' : context
  
  /**
   * 解析词汇数组
   * 将JSON字符串转换为字符串数组
   */
  const words = JSON.parse(wordString)
  
  /**
   * 转换为小写数组
   * 用于大小写不敏感的高亮匹配
   */
  const lowerCaseWords = words.map((item: string) => item.toLocaleLowerCase())
  
  /**
   * 使用正则表达式分割上下文
   * - 创建匹配所有词汇的正则表达式
   - 使用split()方法将文本分割为数组
   * - 匹配的部分和分隔符都会被保留在结果数组中
   * - "gi"标志：全局匹配+忽略大小写
   */
  const parts = restrictedContext.split(new RegExp(`(${lowerCaseWords.join("|")})`, "gi"))
  
  /**
   * 渲染高亮文本
   * - 遍历分割后的文本片段
   * - 对匹配的词汇应用高亮样式
   * - 对普通文本保持默认样式
   */
  return (
    <span>
      {parts.map((part, i) => (
        <span
          key={i}
          className={
            lowerCaseWords.includes(part.trim().toLowerCase())
              ? highlightClassName ? highlightClassName : "font-bold" // 默认使用粗体高亮
              : ""
          }
        >
          {part}
        </span>
      ))}
    </span>
  )
})
