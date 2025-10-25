import Browser from "webextension-polyfill";
import type { ExtensionMessage, BackgroundFetchParam, ExternalMessage } from "./types";
import { getSetting } from "./storage/sync";

/**
 * 背景脚本 - 扩展的核心后台逻辑
 * 
 * 主要功能：
 * 1. 网络请求代理
 * 2. 右键菜单管理
 * 3. 消息监听和处理
 * 4. 用户认证处理
 * 5. 截图功能
 */

// 注释掉的截图功能代码
//const screenshot = async () => {
//   const res = await Browser.tabs.captureVisibleTab();
//   const tabs = await Browser.tabs.query({
//     active: true,
//     currentWindow: true
//   })
//   const message: ExtensionMessage = {
//     type: 'onScreenDataurl',
//     payload: res
//   }
//   Browser.tabs.sendMessage(tabs[0].id!, message);
// }

/**
 * 后台网络请求代理函数
 * @param param 请求参数
 * @returns Promise<any> 响应数据
 * 
 * 功能：
 * - 支持多种HTTP方法
 * - 支持自定义请求头和请求体
 * - 支持多种响应类型（text、json、dataURL）
 * - 统一错误处理
 */
const backgroundFetch = async (param: BackgroundFetchParam) => {
  const { url, method, responseType } = param;
  const options: Record<string, unknown> = {
    method: method ?? "GET",
  };
  if (param.body) {
    options.body = param.body;
  }
  if (param.headers) {
    options.headers = param.headers;
  }
  return fetch(url, options).then(async (res) => {
    //console.log(res);
    if (!res.ok) {
      return {
        error: "fetch failed",
      };
    }
    if (responseType === "dataURL") {
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function () {
          resolve(this.result);
        };
        reader.readAsDataURL(blob);
      });
    } else if (responseType === "text") {
      return await res.text();
    } else if (responseType === "json") {
      return await res.json();
    }
  });
};

/**
 * 扩展安装时的初始化设置
 * 创建右键菜单，用于触发翻译功能
 */
Browser.runtime.onInstalled.addListener(() => {
  Browser.contextMenus.create({
    id: "translate",
    title: "translate",
    contexts: ["selection"],
    documentUrlPatterns: [
      "http://*/*",
      "https://*/*",
      "file://*/*",
      "ftp://*/*",
    ],
  });
});

/**
 * 右键菜单点击事件处理
 * 当用户选择文本并点击右键菜单时，显示翻译卡片
 */
Browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translate") {
    if (!tab?.id) {
      return;
    }
    const message: ExtensionMessage = {
      type: 'showCardAndPosition'
    }
    Browser.tabs.sendMessage(tab?.id, message);
  }
});

/**
 * 扩展内部消息监听器
 * 处理来自内容脚本、弹出窗口等内部组件的消息
 */
Browser.runtime.onMessage.addListener(async (message: ExtensionMessage) => {  
  if (message.type === "fetch") {
    // 处理网络请求代理
    const res = await backgroundFetch(message.payload);
    return res;
  }
  if (message.type === "openOptions") {
    // 打开选项页面
    return await Browser.runtime.openOptionsPage();
  }
  if (message.type === "auth") {
    // 处理Google OAuth认证
    if (chrome && chrome.identity && chrome.identity.getAuthToken) {
      const tokenInfo = await chrome.identity.getAuthToken({
        interactive: true,
      });
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=${tokenInfo.token}`
      );
      return await res.json();
    }
  }
  if (message.type === 'captureScreen') {
    // 截图功能
    return await Browser.tabs.captureVisibleTab()
  }
});

/**
 * 外部扩展消息监听器
 * 处理来自其他扩展的消息
 */
Browser.runtime.onMessageExternal.addListener(async (message: ExternalMessage) => {
  if (message.type === 'getUser') {
    // 获取用户信息
    const setting = await getSetting();
    return setting.userInfo
  }
})