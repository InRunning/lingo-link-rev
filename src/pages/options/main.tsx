/**
 * Options 应用入口
 * - 组织左侧菜单与右侧对应模块（基础设置/引擎/外链/同步/更新日志/问题/其他）
 * - 实现路由管理和页面导航功能
 * - 响应式布局，支持左右分栏结构
 * - 统一的Toast消息提示系统
 */
import { createRoot } from "react-dom/client";
import "@/assets/styles/tailwind.css";
import { useState, useEffect, ReactNode } from "react";
import DataManage from "./dataManage";
import { ToastContainer } from "@/components/Toast";
import Options from "./options";
import "@/i18n.ts";
import EnginesSetting from "./enginsSetting";
import ExternalLinks from "./externalLiks";
import { wordListUrl, wordListWindowName } from "@/utils/const";
// import ScreenshotSetting from "./screenshotSetting";
import UpdateLog from "@/components/UpdateLog";
import Question from './question'
import Other from "./other";
import Sidebar from "./sidebar";
import MovieWeb from "./movieWeb";

// ===================== 类型定义 =====================

/**
 * 菜单项基础接口
 * 定义菜单的基本属性
 */
export interface MenuItem {
  name: string;           // 菜单显示名称
  active: boolean;        // 当前是否激活
  path: string;           // 菜单路径
  externalLink?: string;  // 外部链接（可选）
}

/**
 * 渲染菜单项接口
 * 继承MenuItem并添加React组件属性
 */
export interface RenderMenuItem extends MenuItem {
  component?: ReactNode;  // 对应的React组件
}

/**
 * Options页面主组件
 * 组织整个设置页面的布局和路由管理
 * @returns Options页面React组件
 */
export default function App() {
  // ===================== 菜单状态管理 =====================

  /**
   * 菜单项状态数组
   * 包含所有设置页面的菜单配置和组件映射
   */
  const [menus, setMenus] = useState<RenderMenuItem[]>([
    {
      // 基础设置页面 - 默认激活
      name: "Basic Settings",
      path: "/option",
      active: true,
      component: <Options />,
    },
    {
      // 引擎设置页面
      name: "Engines Settings",
      path: "/engines",
      active: false,
      component: <EnginesSetting />,
    },
    {
      // 外部链接页面
      name: "External Links",
      path: "/externalLinks",
      active: false,
      component: <ExternalLinks />,
    },
    {
      // 生词本页面 - 打开新窗口
      name: "Vocabulary Notebook",
      path: "/wordList",
      active: false,
      component: null, // 无内嵌组件，通过window.open打开
    },
    {
      // 数据同步页面
      name: "Words synchronization",
      path: "/dataManage",
      active: false,
      component: <DataManage />,
    },
    // {
    //   // 截图API设置页面（已注释）
    //   name: "Screenshot API",
    //   path: "/screenshot",
    //   active: false,
    //   component: <ScreenshotSetting />,
    // },
    {
      // 电影网站设置页面
      name: "Movie Webs",
      path: "/movieweb",
      active: false,
      component: <MovieWeb />,
    },
    {
      // 更新日志页面
      name: "Update Log",
      path: "/updateLog",
      active: false,
      component: <UpdateLog />,
    },
    {
      // 问题反馈页面
      name: "Question",
      path: "/question",
      active: false,
      component: <Question />,
    },
    {
      // 其他设置页面
      name: "Other",
      path: "/other",
      active: false,
      component: <Other />,
    }
  ]);

  // ===================== URL路由处理 =====================

  /**
   * URL哈希变化监听Effect
   * 根据浏览器地址栏的hash值更新激活的菜单项
   * 支持书签式导航，用户可直接访问特定页面
   */
  useEffect(() => {
    // 检查是否有hash值
    if (!location.hash.includes("#")) {
      return;
    }
    
    // 解析hash值中的菜单名称
    const name = decodeURIComponent(location.hash.split("#")[1]);
    
    // 更新菜单状态，激活对应的菜单项
    setMenus(
      menus.map((menu) => {
        if (menu.name === name) {
          // 激活匹配的菜单项
          return { ...menu, ...{ active: true } };
        } else {
          // 其他菜单项设为非激活状态
          return { ...menu, ...{ active: false } };
        }
      })
    );
  }, [menus]);

  // ===================== 菜单点击处理 =====================

  /**
   * 菜单项点击处理函数
   * 处理不同的菜单点击逻辑：内嵌组件、外部链接、新窗口打开等
   * @param item - 被点击的菜单项
   */
  const onMenuClick = async (item: MenuItem) => {
    // 生词本页面：打开新窗口
    if (item.path === "/wordList") {
      window.open(wordListUrl, wordListWindowName);
      return;
    }
    
    // 外部链接：打开新窗口
    if (item.externalLink) {
      window.open(item.externalLink);
      return;
    }
    
    // 注释掉的生词本检查逻辑
    // if (item.name === '生词本') {
    //   const setting = await getSettingSyncStorage()
    //   if (setting?.catWordsAccount && setting?.catWordsAccount?.token) {
    //     window.open('https://www.mywords.cc');
    //   }
    // }
    
    // ===================== 更新菜单激活状态 =====================
    
    // 更新菜单状态，激活当前选中的菜单项
    setMenus(
      menus.map((menu) => {
        if (menu.name === item.name) {
          return { ...menu, ...{ active: true } };
        } else {
          return { ...menu, ...{ active: false } };
        }
      })
    );
  };

  // ===================== 组件渲染 =====================

  /** 获取当前激活的菜单项 */
  const activeItem = menus.filter((item) => item.active);

  return (
    <>
      {/* ===================== 主布局结构 ===================== */}
      
      <div className="flex text-[16px]">
        {/* 左侧菜单栏 */}
        <Sidebar
          menus={menus.map((item) => {
            // 移除component属性，只传递Sidebar需要的数据
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { component, ...restObj } = item;
            return restObj;
          })}
          onMenuClick={onMenuClick}
        />
        
        {/* 右侧内容区域 */}
        <div className="grow bg-white h-[100vh] overflow-y-scroll">
          <div className="mx-auto py-[40px] max-w-2xl">
            {/* 渲染当前激活的菜单项组件 */}
            {activeItem[0].component}
          </div>
        </div>
      </div>

      {/* Toast消息提示容器 */}
      <ToastContainer />
    </>
  );
}

// ===================== 应用初始化 =====================

/**
 * React应用挂载
 * 将App组件挂载到DOM根节点
 * 在DOMContentLoaded事件触发后执行
 */
createRoot(document.querySelector("#root")!).render(<App />);
