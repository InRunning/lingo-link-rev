/**
 * 浏览器扩展后台脚本
 * - 扩展的核心后台逻辑，处理网络请求、用户交互、消息通信等
 * - 负责浏览器扩展的权限管理、跨域请求处理、生命周期管理
 * - 包含网络代理、右键菜单、消息监听、用户认证、截图等核心功能
 */
import Browser from "webextension-polyfill";
import type { ExtensionMessage, BackgroundFetchParam, ExternalMessage } from "./types";
import { getSetting } from "./storage/sync";

// ===================== 核心功能概述 =====================

/**
 * 背景脚本 - 扩展的核心后台逻辑
 *
 * 主要功能：
 * 1. 网络请求代理 - 解决CORS问题，支持跨域请求
 * 2. 右键菜单管理 - 在网页中创建翻译快捷入口
 * 3. 消息监听和处理 - 协调各组件间的通信
 * 4. 用户认证处理 - 支持Google OAuth登录
 * 5. 截图功能 - 支持页面截图功能
 * 6. 外部扩展通信 - 与其他扩展进行数据交换
 */

// ===================== 截图功能（已注释） =====================

// 注释掉的截图功能代码，保留作为参考
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

// ===================== 网络请求代理 =====================

/**
 * 后台网络请求代理函数
 * 在浏览器扩展后台执行网络请求，解决CORS跨域限制问题
 * @param param - BackgroundFetchParam 请求参数
 * @returns Promise<any> 响应数据
 *
 * 功能特点：
 * - 支持多种HTTP方法（GET、POST、PUT、DELETE等）
 * - 支持自定义请求头和请求体
 * - 支持多种响应类型（text、json、dataURL、blob）
 * - 统一错误处理和响应格式转换
 * - 处理跨域请求限制
 */
const backgroundFetch = async (param: BackgroundFetchParam) => {
  const { url, method, responseType } = param;
  
  // ===================== 请求参数构建 =====================
  
  /** 请求选项对象 */
  const options: Record<string, unknown> = {
    method: method ?? "GET", // 默认GET方法
  };
  
  /** 添加请求体 */
  if (param.body) {
    options.body = param.body;
  }
  
  /** 添加请求头 */
  if (param.headers) {
    options.headers = param.headers;
  }

  // ===================== 网络请求执行 =====================

  /**
   * 执行网络请求并处理响应
   * 支持不同响应类型的格式化处理
   */
  return fetch(url, options).then(async (res) => {
    // 检查响应状态
    if (!res.ok) {
      return {
        error: "fetch failed",
      };
    }

    // ===================== 响应数据处理 =====================

    /** 根据响应类型进行数据转换 */
    if (responseType === "dataURL") {
      /** 数据URL格式：图片等二进制数据的base64编码 */
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function () {
          resolve(this.result);
        };
        reader.readAsDataURL(blob);
      });
    } else if (responseType === "text") {
      /** 纯文本响应 */
      return await res.text();
    } else if (responseType === "json") {
      /** JSON格式响应 */
      return await res.json();
    }
    // 其他情况直接返回原始响应
  });
};

// ===================== 扩展安装初始化 =====================

/**
 * 扩展安装时的初始化设置
 * 创建右键菜单项，为用户提供翻译功能的快捷入口
 */
Browser.runtime.onInstalled.addListener(() => {
  /** 创建右键菜单项 */
  Browser.contextMenus.create({
    id: "translate",           // 菜单项ID
    title: "translate",        // 显示的文本
    contexts: ["selection"],   // 仅在选中文本时显示
    documentUrlPatterns: [     // 支持的页面协议
      "http://*/*",
      "https://*/*",
      "file://*/*",
      "ftp://*/*",
    ],
  });
});

// ===================== 右键菜单事件处理 =====================

/**
 * 右键菜单点击事件处理
 * 当用户在网页中选中文本并点击右键菜单中的翻译选项时触发
 * 向当前页面发送消息，显示翻译卡片
 */
Browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translate") {
    // 检查标签页ID有效性
    if (!tab?.id) {
      return;
    }
    
    // ===================== 发送消息给内容脚本 =====================
    
    /** 构建消息对象 */
    const message: ExtensionMessage = {
      type: 'showCardAndPosition'
    }
    
    /** 向内容脚本发送消息，显示翻译卡片 */
    Browser.tabs.sendMessage(tab?.id, message);
  }
});

// ===================== 内部消息监听 =====================

/**
 * 扩展内部消息监听器
 * 处理来自内容脚本、弹出窗口、选项页面等内部组件的消息
 * 实现组件间的协调和通信
 */
Browser.runtime.onMessage.addListener(async (message: ExtensionMessage) => {
  // ===================== 网络请求代理 =====================
  
  if (message.type === "fetch") {
    /** 处理网络请求代理请求 */
    const res = await backgroundFetch(message.payload);
    return res;
  }
  
  // ===================== 页面导航 =====================
  
  if (message.type === "openOptions") {
    /** 打开扩展选项页面 */
    return await Browser.runtime.openOptionsPage();
  }
  
  // ===================== 用户认证 =====================
  
  if (message.type === "auth") {
    /** 处理Google OAuth认证流程 */
    if (chrome && chrome.identity && chrome.identity.getAuthToken) {
      // 获取OAuth令牌
      const tokenInfo = await chrome.identity.getAuthToken({
        interactive: true,
      });
      
      // 使用令牌获取用户信息
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=${tokenInfo.token}`
      );
      return await res.json();
    }
  }
  
  // ===================== 截图功能 =====================
  
  if (message.type === 'captureScreen') {
    /** 执行页面截图功能 */
    return await Browser.tabs.captureVisibleTab()
  }
});

// ===================== 外部扩展通信 =====================

/**
 * 外部扩展消息监听器
 * 处理来自其他扩展的消息，实现扩展间的数据交换
 */
Browser.runtime.onMessageExternal.addListener(async (message: ExternalMessage) => {
  if (message.type === 'getUser') {
    /** 获取当前扩展的用户信息 */
    const setting = await getSetting();
    return setting.userInfo
  }
})