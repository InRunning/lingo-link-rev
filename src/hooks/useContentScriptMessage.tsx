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
    // 处理来自后台或其他页面的消息
    const handler = (message:ExtensionMessage) => {      
      if (message.type === 'refreshLocalData' && !isInPopup) {
        // 刷新本地缓存数据：社区备注与生词列表
        getRemarkList().then(res => {
          setRemarkList(res)
        })
        getStorageSwwList().then(res => {
          setSwwList(res)
        })
      }
    }
    // 订阅消息
    Browser.runtime.onMessage.addListener(handler)
    return () => {
      // 取消订阅，避免重复回调与内存泄漏
      Browser.runtime.onMessage.removeListener(handler)
    }
  }, [setRemarkList,setSwwList])
}
