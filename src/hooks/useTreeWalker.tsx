/**
 * Hook：基于 TreeWalker 的页面生词高亮
 * - 将生词表中未掌握/遗忘的单词在页面中批量标记；
 * - 监听 DOM 变化动态增量标记；
 * - 可通过 mouseoverCallback/mouseoutCallback 定制悬停行为。
 */
import { swwListAtom } from "@/store";
import { useAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { treeWalkerMark,ignoreTags } from "@/utils/treeWalkerMark";
const isExtentionPage = location.href.startsWith("chrome-extension");
const checkIfIgnore = () => {
  return location.href.includes('words.mywords.cc')
}

export default function useTreeWalker(
  {mouseoverCallback,
    mouseoutCallback
  }: {
    mouseoverCallback: (_params: { ele: HTMLElement }) => void;
    mouseoutCallback?: ()=> void
  }
) {
  const [swwList] = useAtom(swwListAtom);
  const walkerWords = useMemo(()=>swwList.filter(item => (item.masteryLevel !==1 && item.masteryLevel !==2)).map(item => item.word), [swwList])

  useEffect(()=>{
    
    if (isExtentionPage || checkIfIgnore()) {      
      return;
    }
    
    treeWalkerMark({
      target: document.body,
      words: walkerWords,
      mouseoverCallback,
      mouseoutCallback
    })
    const observer = new MutationObserver(function (mutationsList) {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (
              node.nodeType === 1 && node instanceof HTMLElement && 
              node.innerText.trim() !== "" &&
              !ignoreTags.includes(node.nodeName) &&
              node.nodeName !== 'TRANSLATOR'
            ) {
              
              //console.time('markMutation')              
              setTimeout(() => {
                treeWalkerMark({
                  target: node,
                  words: walkerWords,
                  mouseoverCallback,
                  mouseoutCallback
                })
              }, 0);
              
              //console.timeEnd('markMutation')
            } else if (
              node.nodeType === 3 &&
              (node as Text).data.trim() !== "" &&
              node.parentElement &&
              !ignoreTags.includes(node.parentElement.nodeName)
            ) {
              treeWalkerMark({
                target: node.parentElement,
                words: walkerWords,
                mouseoverCallback,
                mouseoutCallback
              })
            }
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      //unMarkAll();
      observer.disconnect();
    };
  }, [walkerWords, mouseoutCallback, mouseoverCallback])
}
