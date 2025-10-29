/**
 * Lingo Link 扩展的核心内容脚本组件
 * 负责在网页上实现翻译卡片功能，包括：
 * - 文本选择检测与触发
 * - 卡片展示与定位
 * - 多种触发方式（悬停、点击、快捷键）
 * - 上下文感知翻译
 * - 拖拽支持
 * - 事件处理与通信
 * - 国际化支持
 * - 错误处理
 */

import browser from "webextension-polyfill";
import { useCallback, useEffect, useRef, useState } from "react";
import { isSelectionInEditElement, isWord, preventBeyondWindow } from "@/utils";
import TriggerIcon from "@/components/TriggerIcon";
import {
  defaultCardWidth,
  defaultCardMinHeight,
  defaultTranslateWidth,
  defaultTranslateMinHeight,
  defaultSetting,
} from "@/utils/const";
import SearchResult from "@/components/SearchResult";
import { ToastContainer } from "@/components/Toast";
import { getSentenceFromSelection } from "@/utils/getSelection";
import { currentSelectionInfo } from "@/utils";
import { settingAtom } from "../store";
import { useTranslation } from "react-i18next";
import CardDragableWrapper from "@/components/CardDragableWrapper";
import { ErrorBoundary } from "react-error-boundary";
import FallbackComponent from "@/components/FallbackComponent";
import { emitter } from "@/utils/mitt";
import { ExtensionMessage } from "@/types";
import onCaptureScreenResult from "@/utils/onCaptureScreenResult";
import { useAtom } from "jotai";
import useTreeWalker from "@/hooks/useTreeWalker";
import useContentScriptMessage from "@/hooks/useContentScriptMessage";
import hotkeys from "hotkeys-js";
export default function ContentScriptApp() {
  useContentScriptMessage();
  const mouseoverCollectTimer = useRef<number | null>(null);
  const hideCardTimer = useRef<number | null>(null);
  const [setting] = useAtom(settingAtom);
  const { i18n } = useTranslation();

  const [triggerIconShow, setTriggerIconShow] = useState(false);
  const [triggerIconPosition, setTriggerIconPosition] = useState({
    x: 0,
    y: 0,
  });
  const [cardPosition, setCardPosition] = useState({
    x: 0,
    y: 0,
  });
  const [cardShow, setCardShow] = useState(false);
  const rangeRef = useRef<Range | undefined>(undefined);
  const [searchText, setSearchText] = useState("");
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
      setCardShow(true);
      setSearchText(text);
      setTriggerIconShow(false);
      let x = -300;
      let y = -300;
      if (domRect) {
        const position = preventBeyondWindow({
          boxWidth: isWord({
            input: text,
            lang: setting.sourceLanguage?.language,
          })
            ? defaultCardWidth
            : defaultTranslateWidth,
          boxHeight: isWord({
            input: text,
            lang: setting.sourceLanguage?.language,
          })
            ? defaultCardMinHeight
            : defaultTranslateMinHeight,
          domRect,
          gap: 10,
        });
        x = position.x;
        y = position.y;
      }
      if (position) {
        x = position.x;
        y = position.y;
      }
      setCardPosition({
        x,
        y,
      });
    },
    [setting.sourceLanguage?.language]
  );
  const mouseoverCollectCallback = useCallback(
    ({ ele }: { ele: HTMLElement }) => {
      if (mouseoverCollectTimer.current) {
        clearTimeout(mouseoverCollectTimer.current);
      }
      mouseoverCollectTimer.current = window.setTimeout(() => {
        showCardAndPosition({
          text: ele.innerText,
          domRect: ele.getBoundingClientRect(),
        });
      }, 300);
    },
    [showCardAndPosition]
  );
  const mouseoutCollectCallback = useCallback(() => {
    if (mouseoverCollectTimer.current && !cardShow) {
      clearTimeout(mouseoverCollectTimer.current);
    }
  }, [cardShow]);
  const onmouseenterCard = useCallback(() => {
    hideCardTimer.current && clearTimeout(hideCardTimer.current);
  }, []);
  useTreeWalker({
    mouseoverCallback: mouseoverCollectCallback,
    mouseoutCallback: mouseoutCollectCallback,
  });
  useEffect(() => {
    const translate = () => {
      showCardAndPosition({
        text: currentSelectionInfo.word,
        domRect: rangeRef.current!.getBoundingClientRect(),
      });
    };
    if (setting.shoutcut) {
      hotkeys(setting.shoutcut, translate);
    }
    return () => {
      if (setting.shoutcut) {
        hotkeys.unbind();
      }
    };
  }, [setting.shoutcut, showCardAndPosition]);
  useEffect(() => {
    const handleMouseUp = async function (event: MouseEvent) {
      if (isSelectionInEditElement()) {
        return;
      }
      const selection = window.getSelection()?.toString().trim();
      if (
        selection &&
        (setting.showSelectionIcon ?? defaultSetting.showSelectionIcon)
      ) {
        setTriggerIconShow(true);
        setTriggerIconPosition({
          x: event.pageX,
          y: event.pageY + 10,
        });
      }
    };
    const handleMouseDown = function (event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.tagName.toUpperCase() !== "LINGO-LINK") {
        setTriggerIconShow(false);
        setCardShow(false);
      }
    };
    document.body.addEventListener("mouseup", handleMouseUp);
    document.body.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.body.removeEventListener("mouseup", handleMouseUp);
      document.body.removeEventListener("mousedown", handleMouseDown);
    };
  }, [setting.showSelectionIcon]);
  useEffect(() => {
    const handleSelectionChange = () => {
      if (isSelectionInEditElement()) {
        return;
      }
      const selection = window.getSelection()?.toString().trim();
      if (
        selection &&
        window.getSelection()?.containsNode(document.body, true)
      ) {
        currentSelectionInfo.word = selection;
        currentSelectionInfo.context = getSentenceFromSelection(
          window.getSelection()
        );
        rangeRef.current = window.getSelection()?.getRangeAt(0);
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);
  useEffect(() => {
    const hideCard = () => setCardShow(false);
    emitter.on("hideCard", hideCard);
    return () => {
      emitter.off("hideCard", hideCard);
    };
  }, []);
  useEffect(() => {
    emitter.on("showCard", showCardAndPosition);
    return () => {
      emitter.off("showCard", showCardAndPosition);
    };
  }, [showCardAndPosition]);
  const handleTriggerClick = () => {
    showCardAndPosition({
      text: currentSelectionInfo.word,
      domRect: rangeRef.current!.getBoundingClientRect(),
    });
  };
  const hideCard = useCallback(() => {
    setCardShow(false);
  }, []);

  useEffect(() => {
    if (setting.interfaceLanguage !== i18n.language) {
      i18n.changeLanguage(
        setting.interfaceLanguage ?? defaultSetting.interfaceLanguage
      );
    }
  }, [setting.interfaceLanguage, i18n]);
  useEffect(() => {
    const handleMessage = async (message: ExtensionMessage) => {
      if (message.type === "showCardAndPosition") {
        if (!currentSelectionInfo.word || !rangeRef.current) {
          console.warn("don't support input element selection");
          return;
        }
        showCardAndPosition({
          text: currentSelectionInfo.word,
          domRect: rangeRef.current!.getBoundingClientRect(),
        });
      }
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
      if (message.type === "getCurWindowSelectionInfo") {
        const selection = window.getSelection()?.toString().trim();
        if (
          selection &&
          window.getSelection()?.containsNode(document.body, true)
        ) {
          return {
            word: selection,
            context: getSentenceFromSelection(window.getSelection()),
          };
        } else {
          return null;
        }
      }
    };
    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [showCardAndPosition]);

  return (
    <div
      style={{ opacity: 0 }}
      className="bg-inherit !opacity-100"
      id="orange-translator-container"
    >
      <TriggerIcon
        size={setting.triggerIconSize ?? defaultSetting.triggerIconSize}
        url={setting.triggerIcon}
        x={triggerIconPosition.x}
        y={triggerIconPosition.y}
        show={triggerIconShow}
        onClick={handleTriggerClick}
      />
      <ErrorBoundary
        FallbackComponent={(fallbackProps) => (
          <FallbackComponent fallbackProps={fallbackProps} />
        )}
      >
        {cardShow && (
          <CardDragableWrapper
            x={cardPosition.x}
            y={cardPosition.y}
            onClose={hideCard}
            onmouseenter={onmouseenterCard}
          >
            <SearchResult searchText={searchText} />
          </CardDragableWrapper>
        )}
      </ErrorBoundary>
      <ToastContainer />
    </div>
  );
} // ContentScriptApp 定义结束
