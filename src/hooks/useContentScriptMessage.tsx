/**
 * Hook：监听来自 background 的扩展消息
 * - 当收到 refreshLocalData 且当前不在 Popup 环境时，刷新本地备注与生词列表。
 */
import { ExtensionMessage } from "@/types";
import { useEffect } from "react";
import { getList as getStorageSwwList, getRemarkList } from "@/storage/local";
import { useAtom } from "jotai";
import { remarkListAtom, swwListAtom } from "@/store";
import Browser from "webextension-polyfill";
import { isInPopup } from "@/utils";


export default function useContentScriptMessage() {
  const [,setRemarkList] = useAtom(remarkListAtom);
  const [,setSwwList] = useAtom(swwListAtom)
  useEffect(()=>{    
    const handler = (message:ExtensionMessage) => {      
      if (message.type === 'refreshLocalData' && !isInPopup) {
        getRemarkList().then(res => {
          setRemarkList(res)
        })
        getStorageSwwList().then(res => {
          setSwwList(res)
        })
      }
    }
    Browser.runtime.onMessage.addListener(handler)
    return () => {
      Browser.runtime.onMessage.removeListener(handler)
    }
  }, [setRemarkList,setSwwList])
}
