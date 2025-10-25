/**
 * 内容脚本入口
 * - 注册自定义元素 <lingo-link> 并在 ShadowDOM 内挂载 React 应用（避免样式冲突）。
 * - 注入高亮样式，监听全屏切换以保证组件仍存在于正确根节点。
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
    const shadowRoot = this.attachShadow({ mode: "closed" });
    const reactRoot = document.createElement("div");
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
    reactRoot.setAttribute("data-theme", "light");
    const style = document.createElement("style");
    style.innerText = shadowDomStyle + speakerStyle;
    shadowRoot.appendChild(style);

    ReactDOM.createRoot(reactRoot).render(
      <React.StrictMode>
        <SupportFullScreen />
      </React.StrictMode>
    );
    shadowRoot?.appendChild(reactRoot);
  }
}
if (!customElements.get("lingo-link")) {
  customElements.define("lingo-link", LingoLink);
  document.documentElement.appendChild(document.createElement("lingo-link"));
}
(async ()=>{
  const style = document.createElement("style");
  style.innerText = await genHighlightStyle();
  document.head.appendChild(style);
} )()

export function SupportFullScreen() { 
  /**
   * 监听全屏进入/退出时，重新挂载 lingo-link 到当前根节点，避免 UI 丢失
   */
  const [v, setV] = useState(0);
  useEffect(() => {
    const handleFullScreen = function () {
      if (document.fullscreenElement) {
        document.fullscreenElement.appendChild(
          document.querySelector("lingo-link")!
        );
        setV((pre) => pre + 1);
      } else {
        document.documentElement.appendChild(
          document.querySelector("lingo-link")!
        );
        setV((pre) => pre + 1);
      }
    };
    document.addEventListener("fullscreenchange", handleFullScreen);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreen);
    };
  }, []);
  return <LingoCard key={v} />;
}
