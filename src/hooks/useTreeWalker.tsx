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
  // 仅对“未掌握/待巩固”的词进行标注，降低干扰与提升性能
  const walkerWords = useMemo(()=>
    swwList
      .filter(item => (item.masteryLevel !==1 && item.masteryLevel !==2))
      .map(item => item.word)
  , [swwList])

  useEffect(()=>{
    
    if (isExtentionPage || checkIfIgnore()) {      
      return;
    }
    
    // 首次对整页进行标注
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
              // 对新增元素进行延后标注（避免与大批量 DOM 变更竞争主线程）
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
              // 文本节点变更：以父元素为根重新标注
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
      // 解除监听，避免内存泄漏
      //unMarkAll();
      observer.disconnect();
    };
  }, [walkerWords, mouseoutCallback, mouseoverCallback])
}
