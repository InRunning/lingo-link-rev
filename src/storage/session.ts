/**
 * chrome.storage.session 封装
 * - 存放仅在当前浏览器会话有效的数据，例如是否展示登录弹窗
 * - 与chrome.storage.local不同，数据在浏览器重启后会消失
 * - 主要用于临时状态管理和页面间通信
 */
import Browser from "webextension-polyfill";

/**
 * Session存储接口类型定义
 * 定义了session存储中可存储的数据结构
 */
export type SessionStorageInterface = {
  /** 是否显示登录弹窗 */
  showLogin?: boolean,
}

// ===================== Session存储核心操作 =====================

/**
 * 获取session存储的所有数据
 * @returns Promise<SessionStorageInterface> 包含当前session数据的对象
 */
export const getSession = async(): Promise<SessionStorageInterface>=>{
  return await Browser.storage.session.get();
}

/**
 * 设置session存储数据
 * @param param - Partial<SessionStorageInterface> 要设置的session数据
 * @returns Promise<void>
 */
export const setSession = async(param: Partial<SessionStorageInterface>)=>{
  return await Browser.storage.session.set(param);
}

/**
 * 清空所有session存储数据
 * @returns Promise<void>
 */
export const clearSession = async()=>{
  return await Browser.storage.session.clear();
}
