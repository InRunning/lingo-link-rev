/**
 * Lingo Link 扩展的核心内容脚本组件
 * 
 * 这是一个Chrome浏览器扩展的内容脚本，负责在网页上实现翻译功能
 * 主要功能包括：
 * - 文本选择检测与翻译触发
 * - 翻译卡片的显示、定位和交互
 * - 多种触发方式支持（选择文本、悬停、快捷键）
 * - 拖拽支持
 * - 国际化语言切换
 * - 错误边界处理
 */

// 导入浏览器扩展API的polyfill，确保在所有浏览器中都能使用
import browser from "webextension-polyfill";

// React核心Hook导入 - 用于管理组件状态和副作用
import { useCallback, useEffect, useRef, useState } from "react";

// 工具函数导入 - 用于检查用户选择和处理布局
import { isSelectionInEditElement, isWord, preventBeyondWindow } from "@/utils";

// UI组件导入
import TriggerIcon from "@/components/TriggerIcon"; // 触发按钮组件

// 常量导入 - 定义默认的卡片尺寸
import {
  defaultCardWidth,        // 默认单词卡片宽度
  defaultCardMinHeight,    // 默认单词卡片最小高度
  defaultTranslateWidth,   // 默认翻译卡片宽度
  defaultTranslateMinHeight, // 默认翻译卡片最小高度
  defaultSetting,          // 默认设置
} from "@/utils/const";

// 功能组件导入
import SearchResult from "@/components/SearchResult"; // 搜索结果显示组件
import { ToastContainer } from "@/components/Toast";   // 提示消息容器

// 选择文本处理工具
import { getSentenceFromSelection } from "@/utils/getSelection"; // 从选中区域获取完整句子
import { currentSelectionInfo } from "@/utils"; // 当前选择信息的全局状态

// 状态管理 - 使用Jotai进行全局状态管理
import { settingAtom } from "../store"; // 用户设置的状态原子

// 国际化支持
import { useTranslation } from "react-i18next"; // i18next的React Hook

// 拖拽包装器组件
import CardDragableWrapper from "@/components/CardDragableWrapper";

// 错误边界处理
import { ErrorBoundary } from "react-error-boundary"; // React错误边界组件
import FallbackComponent from "@/components/FallbackComponent"; // 错误降级组件

// 事件总线 - 用于组件间通信
import { emitter } from "@/utils/mitt"; // 轻量级事件发布订阅库

// 类型定义
import { ExtensionMessage } from "@/types"; // 扩展消息类型定义
import onCaptureScreenResult from "@/utils/onCaptureScreenResult"; // 屏幕截图结果处理

// 状态管理Hook
import { useAtom } from "jotai"; // Jotai状态管理Hook

// 自定义Hook
import useTreeWalker from "@/hooks/useTreeWalker"; // DOM树遍历Hook
import useContentScriptMessage from "@/hooks/useContentScriptMessage"; // 内容脚本消息处理Hook

// 快捷键处理库
import hotkeys from "hotkeys-js"; // 键盘快捷键管理库

/**
 * 主要的内容脚本组件
 * 这是整个翻译功能的入口组件，负责协调各种交互和状态管理
 */
export default function ContentScriptApp() {
  // 初始化消息处理Hook - 处理来自扩展其他部分的消息
  useContentScriptMessage();
  
  // 使用useRef存储定时器ID，避免组件重新渲染时丢失
  // mouseoverCollectTimer: 处理鼠标悬停的延迟定时器
  const mouseoverCollectTimer = useRef<number | null>(null);
  // hideCardTimer: 处理隐藏卡片的延迟定时器
  const hideCardTimer = useRef<number | null>(null);
  
  // 使用Jotai的useAtom Hook读取全局设置状态
  const [setting] = useAtom(settingAtom);
  
  // 国际化Hook - 提供多语言支持
  const { i18n } = useTranslation();

  // 触发图标显示状态 - 控制选择文本时出现的触发按钮
  const [triggerIconShow, setTriggerIconShow] = useState(false);
  // 触发图标位置状态 - 使用对象存储x、y坐标
  const [triggerIconPosition, setTriggerIconPosition] = useState({
    x: 0,
    y: 0,
  });
  
  // 翻译卡片位置状态
  const [cardPosition, setCardPosition] = useState({
    x: 0,
    y: 0,
  });
  
  // 翻译卡片显示状态 - 控制卡片是否可见
  const [cardShow, setCardShow] = useState(false);
  
  // 使用useRef存储选中的文本范围，用于后续精确定位
  const rangeRef = useRef<Range | undefined>(undefined);
  
  // 搜索文本状态 - 存储当前需要翻译的文本
  const [searchText, setSearchText] = useState("");

  /**
   * 显示翻译卡片并设置位置的回调函数
   * 使用useCallback优化性能，避免不必要的重新创建
   * @param text - 要翻译的文本
   * @param domRect - 可选的DOM元素矩形信息，用于自动定位
   * @param position - 可选的手动指定位置坐标
   */
  const showCardAndPosition = useCallback(
    ({
      text,
      position,
      domRect,
    }: {
      text: string;
      domRect?: DOMRect;
      position?: {
        x: number;
        y: number;
      };
    }) => {
      // 显示卡片并设置搜索文本
      setCardShow(true);
      setSearchText(text);
      setTriggerIconShow(false); // 隐藏触发按钮
      
      // 初始化位置坐标
      let x = -300;
      let y = -300;
      
      // 如果提供了DOM元素矩形，使用自动定位逻辑
      if (domRect) {
        const position = preventBeyondWindow({
          // 根据文本类型（单词 vs 句子）选择不同的卡片尺寸
          boxWidth: isWord({
            input: text,
            lang: setting.sourceLanguage?.language,
          })
            ? defaultCardWidth      // 单词用小卡片
            : defaultTranslateWidth, // 句子用大卡片
          boxHeight: isWord({
            input: text,
            lang: setting.sourceLanguage?.language,
          })
            ? defaultCardMinHeight      // 单词卡片最小高度
            : defaultTranslateMinHeight, // 句子卡片最小高度
          domRect,    // 参考的DOM元素位置
          gap: 10,    // 与参考元素的间距
        });
        x = position.x;
        y = position.y;
      }
      
      // 如果手动指定了位置坐标，使用手动坐标
      if (position) {
        x = position.x;
        y = position.y;
      }
      
      // 更新卡片位置状态
      setCardPosition({
        x,
        y,
      });
    }, 
    // 依赖项数组 - 当这些值变化时，函数会重新创建
    [setting.sourceLanguage?.language]
  );

  /**
   * 鼠标悬停处理回调 - 用于悬停显示翻译
   * 当鼠标悬停在元素上时，延迟300ms后显示翻译
   * @param ele - 悬停的DOM元素
   */
  const mouseoverCollectCallback = useCallback(
    ({ ele }: { ele: HTMLElement }) => {
      // 清除之前的定时器，避免多次触发
      if (mouseoverCollectTimer.current) {
        clearTimeout(mouseoverCollectTimer.current);
      }
      
      // 设置新的定时器，300ms后显示翻译
      mouseoverCollectTimer.current = window.setTimeout(() => {
        showCardAndPosition({
          text: ele.innerText, // 使用元素的内部文本
          domRect: ele.getBoundingClientRect(), // 获取元素位置信息
        });
      }, 300);
    },
    [showCardAndPosition] // 依赖showCardAndPosition函数
  );

  /**
   * 鼠标离开处理回调
   * 用于清除悬停定时器
   */
  const mouseoutCollectCallback = useCallback(() => {
    // 只有在卡片没有显示时才清除定时器
    if (mouseoverCollectTimer.current && !cardShow) {
      clearTimeout(mouseoverCollectTimer.current);
    }
  }, [cardShow]); // 依赖cardShow状态

  /**
   * 鼠标进入卡片事件处理
   * 用于取消隐藏卡片的定时器
   */
  const onmouseenterCard = useCallback(() => {
    // 清除隐藏卡片的定时器
    hideCardTimer.current && clearTimeout(hideCardTimer.current);
  }, []);

  // 使用自定义Hook进行DOM树遍历，监听鼠标事件
  useTreeWalker({
    mouseoverCallback: mouseoverCollectCallback, // 鼠标悬停回调
    mouseoutCallback: mouseoutCollectCallback,   // 鼠标离开回调
  });

  /**
   * 快捷键监听Effect
   * 根据用户设置监听特定的键盘快捷键
   */
  useEffect(() => {
    const translate = () => {
      // 快捷键触发的翻译函数
      showCardAndPosition({
        text: currentSelectionInfo.word,
        domRect: rangeRef.current!.getBoundingClientRect(),
      });
    };

    // 如果用户设置了快捷键，则注册监听器
    if (setting.shoutcut) {
      hotkeys(setting.shoutcut, translate);
    }

    // 清理函数 - 组件卸载或依赖变化时执行
    return () => {
      if (setting.shoutcut) {
        hotkeys.unbind(); // 解除快捷键绑定
      }
    };
  }, [setting.shoutcut, showCardAndPosition]);

  /**
   * 鼠标事件监听Effect
   * 处理鼠标点击和选择事件
   */
  useEffect(() => {
    /**
     * 鼠标释放事件处理
     * 当用户释放鼠标按钮时，检查是否选中了文本
     */
    const handleMouseUp = async function (event: MouseEvent) {
      // 如果选区在可编辑元素内（如输入框），则不处理
      if (isSelectionInEditElement()) {
        return;
      }

      // 获取当前选中的文本并去除首尾空格
      const selection = window.getSelection()?.toString().trim();
      
      // 如果有选中的文本且设置了显示选择图标，则显示触发图标
      if (
        selection &&
        (setting.showSelectionIcon ?? defaultSetting.showSelectionIcon)
      ) {
        setTriggerIconShow(true);
        setTriggerIconPosition({
          x: event.pageX, // 使用页面坐标而不是客户端坐标
          y: event.pageY + 10, // 向下偏移10像素
        });
      }
    };

    /**
     * 鼠标按下事件处理
     * 用于隐藏触发图标和卡片
     */
    const handleMouseDown = function (event: MouseEvent) {
      const target = event.target as HTMLElement;
      // 如果点击的不是扩展相关的元素，则隐藏UI
      if (target.tagName.toUpperCase() !== "LINGO-LINK") {
        setTriggerIconShow(false);
        setCardShow(false);
      }
    };

    // 注册事件监听器
    document.body.addEventListener("mouseup", handleMouseUp);      // 鼠标释放
    document.body.addEventListener("mousedown", handleMouseDown);  // 鼠标按下

    // 清理事件监听器
    return () => {
      document.body.removeEventListener("mouseup", handleMouseUp);
      document.body.removeEventListener("mousedown", handleMouseDown);
    };
  }, [setting.showSelectionIcon]);

  /**
   * 选区变化监听Effect
   * 监听document的selectionchange事件，跟踪用户的选择
   */
  useEffect(() => {
    const handleSelectionChange = () => {
      // 如果选区在可编辑元素内，则不处理
      if (isSelectionInEditElement()) {
        return;
      }

      const selection = window.getSelection()?.toString().trim();
      
      // 如果有选中文本且选区包含在document.body中
      if (
        selection &&
        window.getSelection()?.containsNode(document.body, true)
      ) {
        // 更新全局的选择信息
        currentSelectionInfo.word = selection;
        currentSelectionInfo.context = getSentenceFromSelection(
          window.getSelection()
        );
        // 保存选中的Range对象，用于后续精确定位
        rangeRef.current = window.getSelection()?.getRangeAt(0);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  /**
   * 隐藏卡片事件监听Effect
   * 通过事件总线监听其他组件发出的隐藏卡片请求
   */
  useEffect(() => {
    const hideCard = () => setCardShow(false);
    
    // 监听hideCard事件
    emitter.on("hideCard", hideCard);
    
    return () => {
      // 清理事件监听器
      emitter.off("hideCard", hideCard);
    };
  }, []);

  /**
   * 显示卡片事件监听Effect
   * 通过事件总线监听其他组件发出的显示卡片请求
   */
  useEffect(() => {
    const showCard = (data: {
      text: string;
      domRect?: DOMRect;
      position?: { x: number; y: number; };
    }) => showCardAndPosition(data);
    
    // 监听showCard事件
    emitter.on("showCard", showCard);
    
    return () => {
      emitter.off("showCard", showCard);
    };
  }, [showCardAndPosition]);

  /**
   * 触发图标点击事件处理
   * 当用户点击触发图标时显示翻译卡片
   */
  const handleTriggerClick = () => {
    showCardAndPosition({
      text: currentSelectionInfo.word,
      domRect: rangeRef.current!.getBoundingClientRect(),
    });
  };

  /**
   * 隐藏卡片的回调函数
   * 使用useCallback优化性能
   */
  const hideCard = useCallback(() => {
    setCardShow(false);
  }, []);

  /**
   * 界面语言切换Effect
   * 根据用户设置自动切换界面语言
   */
  useEffect(() => {
    // 如果设置的语言与当前语言不同，则切换语言
    if (setting.interfaceLanguage !== i18n.language) {
      i18n.changeLanguage(
        setting.interfaceLanguage ?? defaultSetting.interfaceLanguage
      );
    }
  }, [setting.interfaceLanguage, i18n]);

  /**
   * 扩展消息处理Effect
   * 处理来自扩展background script或其他content script的消息
   */
  useEffect(() => {
    const handleMessage = async (message: ExtensionMessage) => {
      // 处理显示卡片的请求
      if (message.type === "showCardAndPosition") {
        // 检查是否有当前选择信息
        if (!currentSelectionInfo.word || !rangeRef.current) {
          console.warn("don't support input element selection");
          return;
        }
        showCardAndPosition({
          text: currentSelectionInfo.word,
          domRect: rangeRef.current!.getBoundingClientRect(),
        });
      }

      // 处理屏幕截图结果
      if (message.type === "onScreenDataurl") {
        onCaptureScreenResult(
          message.payload,
          (result, domRect) =>
            showCardAndPosition({
              text: result,
              domRect,
            })
        );
      }

      // 处理获取当前窗口选择信息的请求
      if (message.type === "getCurWindowSelectionInfo") {
        const selection = window.getSelection()?.toString().trim();
        if (
          selection &&
          window.getSelection()?.containsNode(document.body, true)
        ) {
          // 返回选择信息
          return {
            word: selection,
            context: getSentenceFromSelection(window.getSelection()),
          };
        } else {
          return null;
        }
      }
    };

    // 注册消息监听器
    browser.runtime.onMessage.addListener(handleMessage);
    
    return () => {
      // 清理消息监听器
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [showCardAndPosition]);

  // 返回JSX - 组件的UI渲染部分
  return (
    <div
      style={{ opacity: 0 }} 
      className="bg-inherit !opacity-100"
      id="orange-translator-container"
    >
      {/* 触发图标 - 当用户选择文本时显示 */}
      <TriggerIcon
        size={setting.triggerIconSize ?? defaultSetting.triggerIconSize}
        url={setting.triggerIcon}
        x={triggerIconPosition.x}
        y={triggerIconPosition.y}
        show={triggerIconShow}
        onClick={handleTriggerClick}
      />
      
      {/* 错误边界 - 包装翻译卡片，防止组件出错影响整个页面 */}
      <ErrorBoundary
        FallbackComponent={(fallbackProps) => (
          <FallbackComponent fallbackProps={fallbackProps} />
        )}
      >
        {/* 条件渲染翻译卡片 - 只有当cardShow为true时才显示 */}
        {cardShow && (
          <CardDragableWrapper
            x={cardPosition.x}
            y={cardPosition.y}
            onClose={hideCard}
            onmouseenter={onmouseenterCard}
          >
            {/* 搜索结果组件 - 实际的翻译结果显示 */}
            <SearchResult searchText={searchText} />
          </CardDragableWrapper>
        )}
      </ErrorBoundary>
      
      {/* 提示消息容器 - 显示各种状态提示和错误消息 */}
      <ToastContainer />
    </div>
  );
} // ContentScriptApp 组件定义结束