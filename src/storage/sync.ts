/**
 * chrome.storage.sync 封装
 * - 存储跨设备同步的用户设置（Setting）
 */
import { Setting } from "@/types";
import Browser from "webextension-polyfill";
export const getSetting = async(): Promise<Setting>=>{
  return await Browser.storage.sync.get();
}
export const setSetting = async(param: Partial<Setting>)=>{
  return Browser.storage.sync.set(param);
}
export const clearSetting = async()=>{
  return Browser.storage.sync.clear();
}
