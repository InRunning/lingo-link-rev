/**
 * 组件：卡片底部信息栏
 * - 显示翻译引擎信息、刷新按钮和外部链接
 * - 根据运行环境（popup页面或扩展页面）调整布局
 * - 支持多语言显示和工具提示
 * - 专门为翻译结果卡片设计的底部操作区域
 */
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import ExternalLink from "./ExternalLink";
import { isInPopup } from "@/utils";

/**
 * CardFooter组件参数接口
 * @param currentEngine - 当前使用的翻译引擎名称
 * @param sourceLang - 源语言代码
 * @param targetLang - 目标语言代码
 * @param onRefresh - 刷新翻译结果的回调函数
 * @param enEnterConversationClick - 进入对话模式的回调函数（已注释）
 * @param searchText - 搜索的文本内容
 */
export default function CardFooter({
  currentEngine,
  targetLang,
  onRefresh,
  sourceLang,
  searchText,
}: {
  targetLang: string;
  currentEngine: string;
  sourceLang: string;
  onRefresh: () => void;
  enEnterConversationClick: () => void; // 注意：此参数在函数签名中定义但实际未使用
  searchText: string;
}) {
  // 国际化翻译hook
  const { t } = useTranslation();
  
  /**
   * 外部链接组件
   * 显示相关词典和翻译资源的外部链接
   */
  const ExternalCom = (
    <div className="flex items-center space-x-1 text-xs text-gray-400">
      <span>{t("External Links")}:</span>
      <ExternalLink searchText={searchText} />
    </div>
  );
  
  return (
    <>
      {/* 主要底部信息栏 */}
      <div className="flex items-center  text-xs text-gray-400 mt-2 space-x-4">
        <div className="flex items-center">
          {/* 翻译引擎信息显示 */}
          <span>translated by {currentEngine}</span>
          
          {/* 有道引擎语言方向显示 */}
          {currentEngine === "youdao" && (
            <span className="ml-1 text-gray-500">
              {" "}
              {sourceLang} to {targetLang}
            </span>
          )}
          
          {/* 刷新按钮 */}
          <span
            onClick={onRefresh}
            data-tip={t("Refresh")}
            className="ml-2 text-gray-500 mt-[2px] p-[1px] rounded tooltip tooltip-top  cursor-pointer"
          >
            <RotateCcw className={`w-[14px] h-[14px] fill-none`} />
          </span>
          
          {/*
          对话模式按钮（已注释）
          条件：非Google和非有道引擎时显示
          功能：点击进入AI对话模式讨论当前翻译
          状态：暂时禁用，可能在后续版本中启用
          */}
          {/* {currentEngine !== "google" && currentEngine !== "youdao" && (
            <span
              onClick={enEnterConversationClick}
              data-tip={t("Enter The Conversation")}
              className="ml-2 text-gray-500 mt-[2px] p-[1px] rounded tooltip tooltip-top  cursor-pointer"
            >
              <MessagesSquare className={`w-[14px] h-[14px] fill-none`} />
            </span>
          )} */}
        </div>
        
        {/* 非popup环境下显示外部链接 */}
        {!isInPopup && ExternalCom}
      </div>
      
      {/* popup环境下的外部链接（单独行显示） */}
      {isInPopup && <div className="mt-1">{
        ExternalCom
      }
      </div>}
    </>
  );
}
