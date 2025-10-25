/**
 * chrome.storage.session 封装
 * - 存放仅在当前浏览器会话有效的数据，例如是否展示登录弹窗。
 */
import Browser from "webextension-polyfill";
export type SessionStorageInterface = {
  showLogin?: boolean,
} 
export const getSession = async(): Promise<SessionStorageInterface>=>{
  return await Browser.storage.session.get();
}
export const setSession = async(param: Partial<SessionStorageInterface>)=>{  
  return await Browser.storage.session.set(param);
}

export const clearSession = async()=>{  
  return await Browser.storage.session.clear();
}
