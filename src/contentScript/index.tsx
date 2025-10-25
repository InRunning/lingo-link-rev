/**
 * 内容脚本入口
 * - 注册自定义元素 <lingo-link> 并在 ShadowDOM 内挂载 React 应用（避免样式冲突）
 * - 注入高亮样式，监听全屏切换以保证组件仍存在于正确根节点
 * - 处理页面的集成，确保翻译功能在各种页面环境下都能正常工作
 */
import "@/lib/webcomponents-bundle.js";
import React from "react";
import ReactDOM from "react-dom/client";
import shadowDomStyle from "@/assets/styles/tailwind.css?inline";
import speakerStyle from "@/assets/styles/sperkerMotion.css?inline";
import { useState, useEffect } from "react";

import "@/lib/injectScripts";
import "@/i18n.ts";
import LingoCard from './lingoCard'
import {genHighlightStyle} from "@/contentScript/highlightStyle.tsx";

/** 承载应用的自定义元素（Shadow DOM + React Root） */
class LingoLink extends HTMLElement {
  constructor() {
    super();
    
    // ===================== Shadow DOM 初始化 =====================
    
    /** 创建Shadow DOM，模式为"closed"（私有） */
    const shadowRoot = this.attachShadow({ mode: "closed" });
    
    /** 创建React应用的挂载点 */
    const reactRoot = document.createElement("div");
    
    // ===================== React根容器样式设置 =====================
    
    /**
     * 设置React根容器的TailwindCSS类
     * bg-base-100: 背景色
     * text-base-content: 文本内容色
     * !text-[14px]: 强制文本大小为14px
     * text-left: 左对齐
     * leading-normal: 行高正常
     * select-text: 文本可选中
     * visible: 可见
     */
    reactRoot.classList.add(
      ...[
        "bg-base-100",
        "text-base-content",
        "!text-[14px]",
        "text-left",
        "leading-normal",
        "select-text",
        "visible",
      ]
    );
    
    /** 设置数据主题属性 */
    reactRoot.setAttribute("data-theme", "light");
    
    // ===================== 样式注入 =====================
    
    /** 创建style元素并注入TailwindCSS和语音动画样式 */
    const style = document.createElement("style");
    style.innerText = shadowDomStyle + speakerStyle;
    shadowRoot.appendChild(style);

    // ===================== React应用挂载 =====================
    
    /**
     * 创建React根并渲染应用
     * React.StrictMode: 启用开发模式检查
     * SupportFullScreen: 全屏支持组件
     */
    ReactDOM.createRoot(reactRoot).render(
      <React.StrictMode>
        <SupportFullScreen />
      </React.StrictMode>
    );
    
    /** 将React根挂载到Shadow DOM */
    shadowRoot?.appendChild(reactRoot);
  }
}

// ===================== 自定义元素注册 =====================

/** 检查并注册自定义元素，避免重复注册 */
if (!customElements.get("lingo-link")) {
  /** 注册自定义元素到全局customElements */
  customElements.define("lingo-link", LingoLink);
  
  /** 将自定义元素添加到document根节点 */
  document.documentElement.appendChild(document.createElement("lingo-link"));
}

// ===================== 高亮样式注入 =====================

/**
 * 异步生成并注入页面高亮样式
 * 使用动态生成确保样式与用户设置同步
 */
(async ()=>{
  const style = document.createElement("style");
  style.innerText = await genHighlightStyle();
  document.head.appendChild(style);
} )()

/**
 * 全屏支持组件
 * 监听全屏状态变化，确保UI元素在正确的根节点下显示
 * @returns 全屏支持处理后的LingoCard组件
 */
export function SupportFullScreen() {
  // ===================== 全屏状态管理 =====================
  
  /** 版本控制，用于强制重新渲染组件 */
  const [v, setV] = useState(0);
  
  useEffect(() => {
    /**
     * 全屏状态变化处理函数
     * 当进入/退出全屏时，重新挂载 lingo-link 到正确的根节点
     */
    const handleFullScreen = function () {
      if (document.fullscreenElement) {
        // 进入全屏：将元素移动到全屏元素下
        document.fullscreenElement.appendChild(
          document.querySelector("lingo-link")!
        );
        setV((pre) => pre + 1);
      } else {
        // 退出全屏：将元素移回document根节点
        document.documentElement.appendChild(
          document.querySelector("lingo-link")!
        );
        setV((pre) => pre + 1);
      }
    };
    
    // ===================== 事件监听注册 =====================
    
    /** 监听全屏状态变化事件 */
    document.addEventListener("fullscreenchange", handleFullScreen);
    
    // ===================== 清理函数 =====================
    
    /** 组件卸载时移除事件监听器 */
    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreen);
    };
  }, []);
  
  // ===================== 渲染主组件 =====================
  
  /** 返回带有版本控制的LingoCard组件，确保全屏切换时重新渲染 */
  return <LingoCard key={v} />;
}
