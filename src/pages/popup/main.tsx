/**
 * Popup 应用入口
 * - 输入搜索与结果展示、底部用户区、错误边界与全局 Toast
 * - 浏览器扩展popup窗口的主界面，处理用户输入和结果显示
 * - 集成国际化、防抖搜索、用户状态管理等功能
 * - 响应式布局，固定宽度400px的popup窗口
 */
import { createRoot } from "react-dom/client";
import "@/assets/styles/tailwind.css";
import { useCallback, useEffect, useState } from "react";
import debounce from "lodash.debounce";
import { Setting } from "@/types";
import { getSetting } from "@/storage/sync";
import PopupFooter from "./footer";
import { ToastContainer } from "@/components/Toast";
import PopupInput from "@/components/PopupInput";
import "@/i18n.ts";
import SearchResult from "@/components/SearchResult";
import { useTranslation } from "react-i18next";
import { defaultSetting } from "@/utils/const";

// import {
//   ConversationProvider,
//   useConversationContext,
// } from "@/context/conversation";
// import Conversation from "@/components/Conversation";
import { ErrorBoundary } from "react-error-boundary";
import FallbackComponent from "@/components/FallbackComponent";

/**
 * Popup主应用组件
 * 管理整个popup窗口的布局和状态
 * @returns Popup应用React组件
 */
export default function App() {
  const { i18n } = useTranslation();
  
  // ===================== 对话功能状态（已注释） =====================
  
  // const {
  //   conversationShow,
  //   messageList,
  //   conversationEngine,
  //   setConversationShow,
  // } = useConversationContext();
  
  // ===================== 搜索状态管理 =====================
  
  /** 搜索文本状态 */
  const [searchText, setSearchText] = useState("");
  
  /** 用户信息状态 */
  const [user, setUser] = useState<Setting["userInfo"] | null>(null);
  
  // ===================== 防抖搜索处理 =====================

  /**
   * 防抖搜索函数
   * 使用lodash.debounce实现500ms的防抖延迟
   * 避免频繁的API调用，提升用户体验
   */
  // eslint-disable-next-line
  const debounced = useCallback(
    debounce(
      (v: string) => {
        setSearchText(v);
      },
      500, // 延迟500ms执行
      { leading: true, trailing: true } // 立即执行首次调用，并在最后一次调用后执行
    ),
    []
  );

  /**
   * 处理输入提交
   * 将输入文本传递给防抖函数
   * @param text - 用户输入的文本
   */
  const handleInputSubmit = (text: string) => {
    debounced(text);
  };

  // ===================== 初始化Effect =====================

  /**
   * 应用初始化Effect
   * 加载用户设置和国际化配置
   */
  useEffect(() => {
    // 获取用户设置
    getSetting().then((res) => {
      // ===================== 用户信息设置 =====================
      if (res.userInfo) {
        setUser(res.userInfo);
      }
      
      // ===================== 国际化语言设置 =====================
      if (res.interfaceLanguage !== i18n.language) {
        i18n.changeLanguage(
          res.interfaceLanguage ?? defaultSetting.interfaceLanguage
        );
      }
    });
  }, [i18n]);

  // ===================== 主界面渲染 =====================

  return (
    <div id="app-wrapper" className="w-[400px]">
      {/* 注释掉的收集表单/对话显示逻辑 */}
      {/* <div className={`${collectFormShow || conversationShow ? "hidden" : ""}`}> */}
      
      <div>
        {/* ===================== 搜索输入区域 ===================== */}
        <div className={`p-3`}>
          {/* 搜索输入组件 */}
          <PopupInput onSubmit={handleInputSubmit} />
          
          {/* 搜索结果显示区域 */}
          <div className="relative">
            {searchText && <SearchResult searchText={searchText} />}
          </div>
        </div>
        
        {/* ===================== 底部用户区域 ===================== */}
        <PopupFooter user={user} />
      </div>

      {/* ===================== 收集表单容器 ===================== */}
      {/* 用于Portal渲染收集表单的占位容器 */}
      <div id="collect-wrapper"></div>

      {/* ===================== 错误边界包装 ===================== */}
      <ErrorBoundary
        FallbackComponent={(fallbackProps) => (
          <FallbackComponent fallbackProps={fallbackProps} />
        )}
      >
        {/* 注释掉的对话功能组件 */}
        {/* {conversationShow && conversationEngine ? (
          <Conversation
            onClose={() => {
              setConversationShow(false);
            }}
            className="relative top-0 h-[400px] z-10"
            engine={conversationEngine}
            preMessageList={messageList}
          />
        ) : null} */}
      </ErrorBoundary>

      {/* ===================== 全局Toast消息提示 ===================== */}
      <ToastContainer />
    </div>
  );
}

// ===================== 应用挂载 =====================

/**
 * React应用挂载
 * 将App组件挂载到DOM根节点
 * 提供两个版本：基础版本和对话功能版本
 */
createRoot(document.querySelector("#root")!).render(
  <App />
  // <ConversationProvider>
  //     <App />
  // </ConversationProvider>
);
