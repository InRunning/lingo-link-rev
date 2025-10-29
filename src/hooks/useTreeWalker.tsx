/**
 * DOM树遍历Hook
 * 
 * 这个Hook负责在网页上智能地标注单词，支持悬停翻译功能
 * 主要功能：
 * - 遍历网页DOM树，寻找并标注目标单词
 * - 支持动态网页的增量标注
 * - 性能优化：只标注"未掌握/待巩固"的单词
 * - 忽略特定标签和页面，减少干扰
 */

import { swwListAtom } from "@/store";
import { useAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { treeWalkerMark,ignoreTags } from "@/utils/treeWalkerMark";

// 检查当前是否为扩展页面（避免在扩展页面内运行）
const isExtentionPage = location.href.startsWith("chrome-extension");

// 检查是否需要忽略当前页面（如单词列表页面）
const checkIfIgnore = () => {
  return location.href.includes('words.mywords.cc')
}

/**
 * DOM树遍历Hook
 * 
 * @param mouseoverCallback - 鼠标悬停时的回调函数
 * @param mouseoutCallback - 鼠标离开时的回调函数（可选）
 */
export default function useTreeWalker(
  {mouseoverCallback,
    mouseoutCallback
  }: {
    mouseoverCallback: (_params: { ele: HTMLElement }) => void;  // 悬停回调，传入悬停的DOM元素
    mouseoutCallback?: ()=> void                                 // 离开回调，可选
  }
) {
  // 获取用户的学习单词列表
  const [swwList] = useAtom(swwListAtom);
  
  /**
   * 过滤需要标注的单词
   * 
   * 只选择"未掌握/待巩固"的单词进行标注：
   * - masteryLevel !== 1 表示未掌握
   * - masteryLevel !== 2 表示待巩固
   * 
   * 这样的设计可以：
   * 1. 减少对已掌握单词的干扰
   * 2. 提升页面性能，减少DOM操作
   * 3. 专注于用户需要练习的内容
   */
  const walkerWords = useMemo(()=>
    swwList
      .filter(item => (item.masteryLevel !==1 && item.masteryLevel !==2))  // 过滤出未掌握和待巩固的单词
      .map(item => item.word)                                             // 提取单词字符串
  , [swwList])  // 依赖swwList变化时重新计算

  useEffect(()=>{
    // 如果是扩展页面或需要忽略的页面，则不执行标注
    if (isExtentionPage || checkIfIgnore()) {      
      return;
    }
    
    /**
     * 首次整页标注
     * 
     * 对整个网页进行一次全面的单词标注，
     * 找到所有匹配的单词并添加事件监听器
     */
    treeWalkerMark({
      target: document.body,           // 从body开始遍历整个页面
      words: walkerWords,             // 要标注的单词列表
      mouseoverCallback,              // 悬停回调
      mouseoutCallback                // 离开回调
    })
    
    /**
     * 监听DOM变化，用于动态网页
     * 
     * 当网页内容动态变化时（如单页应用、无限滚动等），
     * 能够及时为新增的内容添加单词标注
     */
    const observer = new MutationObserver(function (mutationsList) {
      // 遍历所有DOM变化
      for (const mutation of mutationsList) {
        // 只处理新增节点的情况
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            /**
             * 处理元素节点
             * 
             * 当新增的是HTML元素时，需要检查：
             * 1. 元素类型为1（HTML元素）
             * 2. 元素有文本内容
             * 3. 不在忽略标签列表中
             * 4. 不是扩展相关的标签
             */
            if (
              node.nodeType === 1 && 
              node instanceof HTMLElement && 
              node.innerText.trim() !== "" &&
              !ignoreTags.includes(node.nodeName) &&
              node.nodeName !== 'TRANSLATOR'
            ) {
              /**
               * 增量标注
               * 
               * 使用setTimeout延迟执行，避免与大批量DOM变更竞争主线程
               * 这是一个性能优化措施，确保页面流畅性
               */
              //console.time('markMutation')              
              setTimeout(() => {
                treeWalkerMark({
                  target: node,              // 针对新增的元素进行标注
                  words: walkerWords,
                  mouseoverCallback,
                  mouseoutCallback
                })
              }, 0);
              //console.timeEnd('markMutation')
              
            /**
             * 处理文本节点
             * 
             * 当新增的是文本节点时，需要：
             * 1. 确保文本不为空
             * 2. 确保有父元素
             * 3. 确保父元素不在忽略列表中
             * 4. 以父元素为根重新标注
             */
            } else if (
              node.nodeType === 3 &&                                    // 文本节点
              (node as Text).data.trim() !== "" &&                     // 文本不为空
              node.parentElement &&                                     // 有父元素
              !ignoreTags.includes(node.parentElement.nodeName)        // 父元素不在忽略列表
            ) {
              /**
               * 文本节点重新标注
               * 
               * 当文本内容发生变化时，以父元素为根重新进行单词标注
               * 这样可以确保文本变更后的单词仍然被正确标注
               */
              treeWalkerMark({
                target: node.parentElement,    // 以父元素为根进行标注
                words: walkerWords,
                mouseoverCallback,
                mouseoutCallback
              })
            }
          }
        }
      }
    });
    
    /**
     * 开始监听DOM变化
     * 
     * - childList: 监听子节点变化
     * - subtree: 监听所有后代节点变化
     */
    observer.observe(document.body, { childList: true, subtree: true });
    
    /**
     * 清理函数
     * 
     * 当组件卸载或依赖变化时，执行清理操作
     * 断开MutationObserver的连接，避免内存泄漏
     */
    return () => {
      // 解除监听，避免内存泄漏
      //unMarkAll();  // 可能用于清理之前标注的逻辑（当前被注释）
      observer.disconnect();
    };
  }, [walkerWords, mouseoutCallback, mouseoverCallback])  // 依赖项变化时重新执行
}

/**
 * DOM树遍历Hook - 使用说明
 * 
 * 主要作用：
 * 1. 在网页上智能标注目标单词
 * 2. 支持悬停翻译功能
 * 3. 处理动态网页的内容变化
 * 4. 性能优化：只标注需要练习的单词
 * 
 * 技术特点：
 * - 使用MutationObserver监听DOM变化
 * - 延迟执行增量标注，避免性能问题
 * - 忽略特定标签和页面，减少干扰
 * - 自动处理元素节点和文本节点的变化
 * 
 * 使用场景：
 * - 语言学习网页
 * - 在线阅读工具
 * - 单词练习扩展
 * - 翻译辅助工具
 */