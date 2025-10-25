/**
 * chrome.storage.sync 封装
 * - 存储跨设备同步的用户设置（Setting）
 * - 数据会在用户登录的多个设备间自动同步
 * - 存储容量有限制，适合存储用户的偏好设置
 * - 与local不同，数据不会因设备重启而丢失
 */
import { Setting } from "@/types";
import Browser from "webextension-polyfill";

// ===================== 同步存储核心操作 =====================

/**
 * 获取用户设置
 * 从chrome.storage.sync获取当前用户的设置配置
 * @returns Promise<Setting> 用户设置对象
 */
export const getSetting = async(): Promise<Setting>=>{
  return await Browser.storage.sync.get();
}

/**
 * 设置用户配置
 * 将用户设置保存到chrome.storage.sync，支持多设备同步
 * @param param - Partial<Setting> 部分设置数据
 * @returns Promise<void>
 */
export const setSetting = async(param: Partial<Setting>)=>{
  return Browser.storage.sync.set(param);
}

/**
 * 清空所有同步设置
 * 谨慎使用，会清除所有用户的跨设备同步数据
 * @returns Promise<void>
 */
export const clearSetting = async()=>{
  return Browser.storage.sync.clear();
}
