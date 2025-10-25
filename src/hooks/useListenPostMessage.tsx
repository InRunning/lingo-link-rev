/**
 * Hook：监听 window.postMessage
 * - 将消息统一回调到业务层，自动绑定/解绑事件。
 */
import { useEffect } from "react";
import type { PostMessage } from "@/types";
export default function useListenPostMessage(callback:(data:PostMessage,source?:MessageEventSource | null)=>void) {
  useEffect(()=>{
    const handleMessage = (e:MessageEvent<PostMessage>) => {
      const data = e.data;            
      callback(data, e.source)
    };
    window.addEventListener('message', handleMessage);
    return ()=>{
      window.removeEventListener('message', handleMessage);
    }
  }, [callback])
}
