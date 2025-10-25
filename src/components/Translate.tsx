/**
 * 组件：翻译结果展示组件
 * - 负责显示翻译结果、收藏状态、学习进度等信息
 * - 支持多种交互功能：收藏、标记已掌握、添加笔记、语音播放等
 * - 集成翻译API调用，显示加载状态和错误处理
 * - 提供上下文句子的高亮显示和笔记渲染
 */
import { useEffect, useState, useRef } from "react";
import { CheckCheck, Heart, Undo2, MessageCircle, Pencil } from "lucide-react";
import Highlight from "./Highlight";
import type { CommunityItemType, Sww } from "@/types/words";
import InputBlink from "./InputBlink";
import { Message } from "@/types/chat";
import { useErrorBoundary } from "react-error-boundary";
import { defaultSetting } from "@/utils/const";
import { useTranslation } from "react-i18next";
//import { useConversationContext } from "@/context/conversation";
import YoudaoSpeaker from "./Speaker";
import translate from "@/utils/translate";
import { EngineValue } from "@/types";
import CardFooter from "./CardFooter";
import { useAtom } from "jotai";
import { settingAtom } from "@/store";
import RenderRemark from "./RenderRemark";

/**
 * Translate组件参数接口
 * @param searchText - 待翻译的文本
 * @param collectInfo - 收藏信息，包含掌握程度等数据
 * @param remarkInfo - 备注信息，包含笔记内容和图片
 * @param onHeartClick - 收藏/取消收藏回调
 * @param onMasterClick - 标记已掌握/忘记回调
 * @param onPencilClick - 编辑备注回调
 * @param currentEngine - 当前使用的翻译引擎
 * @param onRefresh - 刷新翻译结果回调
 */
export default function Translate({
  searchText,
  collectInfo,
  remarkInfo,
  onHeartClick,
  onMasterClick,
  onPencilClick,
  currentEngine,
  onRefresh,
}: {
  searchText: string;
  collectInfo: Sww | undefined;
  remarkInfo:Partial<CommunityItemType>
  onHeartClick: () => void;
  onMasterClick: () => void;
  onPencilClick: () => void;
  currentEngine: EngineValue;
  onRefresh: () => void;
}) {
  // 国际化翻译hook
  const { t } = useTranslation();
  // const { setConversationShow, setMessageList, setConversationEngine } =
  //   useConversationContext();
  
  // 全局设置状态
  const [setting] = useAtom(settingAtom);
  
  // 本地状态管理
  const [loading, setLoading] = useState(false);         // 加载状态
  const [generating, setGenerating] = useState(false);   // 生成中状态
  const [translateResult, setTranslateResult] = useState(""); // 翻译结果
  
  // 消息列表引用，用于传递给对话组件
  const messageListRef = useRef<Message[]>([]);
  
  // 错误边界处理
  const { showBoundary } = useErrorBoundary();
  
  // 判断是否已掌握该词汇
  const isMastered =
    collectInfo &&
    (collectInfo.masteryLevel === 1 || collectInfo.masteryLevel === 2);
    
  // 获取源语言和目标语言设置
  const sourceLang =
    setting.sourceLanguage?.language ?? defaultSetting.sourceLanguage.language;
  const targetLang = setting.targetLanguage ?? defaultSetting.targetLanguage;

  /**
   * 进入对话模式回调
   * 将当前翻译记录作为预加载消息，切换到AI对话模式
   */
  const enterConversation = () => {
    // setConversationShow(true);
    // setMessageList(messageListRef.current);
    // setConversationEngine(currentEngine);
  };
  
  /**
   * 翻译请求Effect
   * 当searchText或currentEngine变化时触发新的翻译请求
   */
  useEffect(() => {
    let ignore = false; // 防止组件卸载后继续更新状态
    
    translate({
      originText: searchText,
      engine: currentEngine,
      beforeRequest() {
        setLoading(true); // 开始加载
      },
      onError(msg) {
        setLoading(false);
        setGenerating(false);
        showBoundary(msg); // 显示错误信息
      },
      onGenerating(result) {
        if (ignore) {
          return;
        }
        setLoading(false);
        setGenerating(true);
        setTranslateResult(result); // 显示流式生成结果
      },
      onSuccess(result, messageList) {
        if (ignore) {
          return;
        }
        setLoading(false);
        setGenerating(false);
        setTranslateResult(result); // 显示最终翻译结果
        if (messageList) {
          messageListRef.current = messageList; // 保存消息列表用于对话
        }
      },
    });
    
    return () => {
      ignore = true; // 组件卸载时忽略状态更新
    };
  }, [searchText, currentEngine, showBoundary]);
  
  let result;
  
  // 加载中状态显示骨架屏
  if (loading) {
    return (
      <div className="flex flex-col gap-2 w-full p-2">
        <div className="skeleton h-4 w-28"></div>
        <div className="skeleton h-4 w-full"></div>
        <div className="skeleton h-4 w-full"></div>
      </div>
    );
  }
  
  try {
    result = (
      <div className="relative space-y-2 text-[15px] px-2 pb-3 pt-3">
        {/* 主要翻译结果显示区域 */}
        <div>
          <span>{translateResult}</span>

          {/* 加载动画（流式生成时显示） */}
          {generating && <InputBlink />}
          
          {/* 功能按钮组和语音播放 */}
          <span className="align-bottom inline-flex items-center ml-[6px] gap-1">
            <span className=" space-x-1 relative top-[3px]">
              {/* 收藏按钮 */}
              <span
                onClick={onHeartClick}
                data-tip={
                  collectInfo
                    ? t("Remove from collection")
                    : t("Add to collection")
                }
                className="p-[1px] rounded tooltip tooltip-bottom w-[16px] h-[16px] cursor-pointer"
              >
                <Heart
                  className={`w-full h-full stroke-base-content ${
                    collectInfo ? "fill-base-content stroke-base-content" : ""
                  } `}
                />
              </span>

              {/* 已掌握/忘记按钮（仅在收藏时显示） */}
              {collectInfo && (
                <span
                  onClick={onMasterClick}
                  data-tip={isMastered ? t("Forgot") : t("Mastered")}
                  className="p-[4px] rounded tooltip tooltip-bottom w-[21px] h-[21px] cursor-pointer"
                >
                  {isMastered ? (
                    <Undo2
                      className={`w-full h-full stroke-base-content stroke-2`}
                    />
                  ) : (
                    <CheckCheck
                      className={`w-full h-full stroke-base-content`}
                    />
                  )}
                </span>
              )}
              
              {/* 笔记按钮（仅在收藏且无备注时显示） */}
              {collectInfo && !remarkInfo.content && !remarkInfo.imgs?.length && (
                <span
                  className="p-[4px] rounded tooltip tooltip-bottom w-[21px] h-[21px] cursor-pointer"
                  data-tip={t("Take Notes")}
                  onClick={onPencilClick}
                >
                  <MessageCircle className="w-full h-full" />
                </span>
              )}
            </span>
            
            {/* 语音播放按钮 */}
            <YoudaoSpeaker
              className="mt-[1px]"
              lang={sourceLang}
              autoPlay={false}
              text={searchText}
              type={"2"}
            />
          </span>
        </div>

        {/* 备注内容显示区域 */}
        { (remarkInfo.content || remarkInfo.imgs?.length) ? (
          <div className="my-2">
            <div
              className="flex items-center space-x-2 mb-1"
              onClick={onPencilClick}
            >
              <span className="text-lg font-bold">{t("Notes")}</span>
              <div
                data-tip={t("Edit")}
                className="p-[4px] rounded tooltip tooltip-bottom w-[21px] h-[21px] cursor-pointer"
              >
                <Pencil className="w-full h-full" />
              </div>
            </div>
            <RenderRemark content={remarkInfo.content} imgs={remarkInfo.imgs ?? []} />
            </div>
        ) : null}
        
        {/* 上下文句子显示区域 */}
        {collectInfo && collectInfo.context && (
          <div className="my-2">
            <div
              className="flex items-center space-x-2 mb-1"
              onClick={onPencilClick}
            >
              <span className="text-lg font-bold">
                {t("Sentence Containing the Word")}
              </span>
              <div
                data-tip={t("Edit")}
                className="p-[4px] rounded tooltip tooltip-bottom w-[21px] h-[21px] cursor-pointer"
              >
                <Pencil className="w-full h-full" />
              </div>
            </div>
            <div>
              <Highlight
                highlightClassName="font-bold"
                context={collectInfo.context}
                wordString={JSON.stringify([searchText])}
              />
            </div>
          </div>
        )}
        
        {/* 卡片底部操作区域 */}
        <CardFooter
          currentEngine={currentEngine}
          sourceLang={sourceLang}
          targetLang={targetLang}
          onRefresh={onRefresh}
          enEnterConversationClick={enterConversation}
          searchText={searchText}
        />
      </div>
    );
  } catch (error) {
    // 错误状态显示
    result = (
      <div className="text-center py-[20px] text-[13px] text-red-600">
        {t("An error occurred")}
      </div>
    );
  }
  
  return (
    <>
      <div>{result}</div>
    </>
  );
}
