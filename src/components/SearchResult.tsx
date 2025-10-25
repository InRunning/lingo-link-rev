/**
 * 搜索结果展示组件
 * - 核心翻译和单词管理功能的主组件
 * - 根据搜索内容类型（单词/句子）智能选择渲染组件
 * - 集成多种引擎选择和错误边界处理
 * - 支持单词收藏、备注管理和用户状态检查
 * - 自动保存功能，支持用户登录状态下的单词收集
 * - 响应式设计，支持popup和content script两种模式
 */
import { getCollectWord, isSameWord } from "../utils";
import { useState, useEffect, useRef } from "react";
import type { CommunityItemType, CommunityType, Sww } from "@/types/words";
import Translate from "./Translate";
import Word from "./Word";
import { currentSelectionInfo } from "../utils";
import { isWord } from "../utils";
import type { CollectRemarkInfo, EngineValue } from "@/types";
import { allSentenceEngineList, allWordEngineList } from "@/utils/const";
import EngineDropdown from "./EngineDropdown";
import { ErrorBoundary } from "react-error-boundary";
import FallbackComponent from "./FallbackComponent";
import { isInPopup } from "@/utils";
import Login from "./Login";
import { showLogin } from "./Login";
import { useAtom } from "jotai";
import {
  addSwwAtom,
  removeSwwAtom,
  updateSwwItemAtom,
  settingAtom,
  swwListAtom,
  collectShowAtom,
  collectInputBasicAtom,
  collectInputRemarkAtom,
  remarkListAtom,
} from "@/store";
import Browser from "webextension-polyfill";
import { setSession } from "@/storage/session";
import { createPortal } from "react-dom";
import CollectModal from "./CollectModal";
import CollectForm from "./CollectForm";
import { v4 as uuidv4 } from "uuid";
import { hasWord } from "../utils";
import {
  getLocal,
  addRemark,
  removeRemark,
  updateRemark,
} from "@/storage/local";
import { toastManager } from "./Toast";
import {
  addCommunity,
  deleteCommunity,
  editItemContent,
  uploadMultiBase64,
} from "@/api";
import { useImmerAtom } from "jotai-immer";
import { getSetting } from "@/storage/sync";

/**
 * 搜索结果展示组件
 * 根据搜索内容类型智能显示翻译结果或单词详情
 * @param props - 组件属性
 * @param props.searchText - 搜索的文本内容
 * @returns 搜索结果展示React组件
 */
export default function TranslateContent({
  searchText,
}: {
  searchText: string;
}) {

  // ===================== 全局状态管理 =====================

  /** 单词收集列表 */
  const [swwList] = useAtom(swwListAtom);
  
  /** 添加单词操作 */
  const [, addSww] = useAtom(addSwwAtom);
  
  /** 删除单词操作 */
  const [, removeSww] = useAtom(removeSwwAtom);
  
  /** 更新单词操作 */
  const [, updateSww] = useAtom(updateSwwItemAtom);
  
  /** 应用设置状态 */
  const [setting] = useAtom(settingAtom);
  
  /** 备注列表状态（使用Immer进行不可变更新） */
  const [remarkList, setRemarkList] = useImmerAtom(remarkListAtom);
  
  /** 收集表单基础信息状态 */
  const [collectInputBasic, setCollectBasicInfo] = useAtom(collectInputBasicAtom);
  
  /** 收集表单备注信息状态 */
  const [collectInputRemark, setCollectInputRemark] = useAtom(collectInputRemarkAtom);
  
  /** 收集表单显示状态 */
  const [collectShow, setCollectShow] = useAtom(collectShowAtom);

  // ===================== 本地状态管理 =====================

  /** 当前选中的翻译引擎 */
  const [currentEngine, setCurrentEngine] = useState<EngineValue | null>(null);
  
  /** 当前单词的收集信息 */
  const [wordCollectInfo, setCurrentCollect] = useState<Sww | undefined>(undefined);
  
  /** 当前单词的备注信息 */
  const [wordRemarkInfo, setWordRemarkInfo] = useState<Partial<CommunityItemType>>({});
  
  /** Content Script包装器引用（用于Portal） */
  const [contentScriptWrapper, setContentScriptWrapper] = useState<HTMLDivElement | null>(null);
  
  /** 翻译组件版本控制（用于强制刷新） */
  const [translateV, setTranslateV] = useState(0);
  
  /** 单词组件版本控制（用于强制刷新） */
  const [wordV, setWordV] = useState(0);

  // ===================== 引用管理 =====================

  /** 主容器引用 */
  const divRef = useRef<HTMLDivElement | null>(null);
  
  /** 错误边界组件引用 */
  const fallbackComRef = useRef<React.ComponentRef<typeof FallbackComponent>>(null);

  // ===================== 初始化和事件处理 =====================

  /**
   * 显示收集表单
   * 根据运行环境（popup vs content script）选择合适的显示方式
   */
  const showCollectForm = () => {
    if (isInPopup) {
      // Popup模式：直接设置显示状态
      setCollectShow(true);
    } else {
      // Content Script模式：创建Portal显示
      const root = divRef.current?.getRootNode() as HTMLElement;
      setCollectShow(true);
      setContentScriptWrapper(
        root.querySelector("#orange-translator-container") as HTMLDivElement
      );
    }
  // ===================== UseEffect 钩子函数 =====================

  /**
   * 引擎选择Effect
   * 根据搜索内容和用户设置选择合适的翻译引擎
   */
  useEffect(() => {
    const isWordResult = isWord({
      input: searchText,
      lang: setting.sourceLanguage?.language,
    });
    
    if (isWordResult) {
      // 单词模式：选择单词引擎
      const list = setting.wordEngineList ?? allWordEngineList;
      if (list && list instanceof Array && list.length) {
        setCurrentEngine(list.filter((item) => item.checked)[0].value);
      } else {
        setCurrentEngine(allWordEngineList[0].value);
      }
    } else {
      // 句子模式：选择句子引擎
      const list = setting.sentenceEngineList ?? allSentenceEngineList;
      if (list && list instanceof Array && list.length) {
        setCurrentEngine(list.filter((item) => item.checked)[0].value);
      } else {
        setCurrentEngine(allSentenceEngineList[0].value);
      }
    }
  }, [
    searchText,
    setting.wordEngineList,
    setting.sentenceEngineList,
    setting.sourceLanguage?.language,
  ]);

  /**
   * 错误边界重置Effect
   * 引擎变更时清除错误状态
   */
  useEffect(() => {
    fallbackComRef.current?.hideError();
  }, [currentEngine]);

  /**
   * 单词收集信息同步Effect
   * 根据搜索词获取已收集的单词信息和默认上下文
   */
  useEffect(() => {
    const result = getCollectWord({ word: searchText, swwList });
    setCurrentCollect(result);
    setCollectBasicInfo(
      result
        ? { word: result.word, context: result.context! }
        : {
            word: currentSelectionInfo.word,
            context: currentSelectionInfo.context,
          }
    );
  }, [searchText, swwList, setCollectBasicInfo]);

  /**
   * 备注信息同步Effect
   * 根据搜索词获取对应的备注信息
   */
  useEffect(() => {
    if (searchText) {
      const recentRemark = remarkList.filter(
        (item) => item.word === searchText
      )[0];
      setWordRemarkInfo(recentRemark ?? {});
      setCollectInputRemark(recentRemark ?? {});
    } else {
      setWordRemarkInfo({});
      setCollectInputRemark({} as CollectRemarkInfo);
    }
  }, [searchText, setCollectInputRemark, remarkList]);

  /**
   * 自动保存单词Effect
   * 用户已登录且启用自动保存时，自动收集搜索的单词
   */
  useEffect(() => {
    let ignore = false;
    
    Promise.all([getSetting(), getLocal()]).then(res => {
      if (ignore) {return}
      
      const setting = res[0];
      const swwList = res[1].swwList;
      const isWordResult = isWord({
        input: searchText,
        lang: setting.sourceLanguage?.language,
      });
      
      // 检查是否需要自动保存
      if (!isWordResult) {return}                    // 非单词不自动保存
      if (!setting.autoSaveWord) {return}           // 未启用自动保存
      if (!setting.userInfo) {return}               // 用户未登录
      if (swwList?.find(item => isSameWord(item.word, searchText))) {return} // 已存在
      
      // 创建新单词项
      const item = {
        id: uuidv4(),
        lastEditDate: Date.now(),
        word: searchText,
        context: currentSelectionInfo.context ?? searchText
      };
      addSww(item);
    });
      
    return () => {
      ignore = true;  // 防止组件卸载后继续执行异步操作
    };
  }, [searchText, addSww]);

  // ===================== 交互操作处理函数 =====================

  /**
   * 处理收藏按钮点击
   * - 检查用户登录状态
   * - 已收藏：取消收藏
   * - 未收藏：显示收集表单
   */
  const handleHeartClick = async () => {
    if (!setting.userInfo?.token) {
      // 用户未登录：显示登录对话框
      if (isInPopup) {
        setSession({ showLogin: true });
        Browser.runtime.openOptionsPage();
      } else {
        showLogin();
      }
      return;
    }

    if (wordCollectInfo?.id) {
      // 已收藏：取消收藏
      removeSww(wordCollectInfo);
    } else {
      // 未收藏：显示收集表单
      showCollectForm();
    }
  };

  /**
   * 处理掌握级别切换
   * 在已掌握和未掌握之间切换
   */
  const handleMasterClick = () => {
    const newLevel = wordCollectInfo?.masteryLevel === 1 ? 0 : 1;
    updateSww({ ...wordCollectInfo!, ...{ masteryLevel: newLevel } });
  };

  /**
   * 处理权重调整
   * 更新单词的学习权重
   * @param num - 新的权重值
   */
  const handleWeightChange = (num: number) => {
    if (!wordCollectInfo) {
      return;
    }
    updateSww({ ...wordCollectInfo, ...{ weight: num } });
  };

  /**
   * 处理编辑按钮点击
   * 显示收集表单进行编辑
   */
  const handlePencilClick = () => {
    showCollectForm();
  };

  /**
   * 处理刷新操作
   * 强制重新渲染翻译或单词组件
   * @param type - 刷新类型：translate 或 word
   */
  const onRefresh = (type: "translate" | "word") => {
    if (type === "translate") {
      setTranslateV((pre) => ++pre);
    } else {
      setWordV((pre) => ++pre);
    }
  };

  /**
   * 处理收集表单提交
   * 复杂的提交逻辑，包含单词和备注的创建、更新、删除操作
   */
  const handleCollectSubmit = async () => {
    let item: Sww | null = null;

    // ============ 单词部分处理 ============
    
    // 情况1：编辑现有单词（基础信息变更）
    if (
      collectInputBasic &&
      wordCollectInfo &&
      collectInputBasic.word !== wordCollectInfo?.word &&
      collectInputBasic.context !== wordCollectInfo?.context
    ) {
      item = {
        ...wordCollectInfo,
        lastEditDate: Date.now(),
        ...collectInputBasic,
      };
      updateSww(item);
    }

    // 情况2：创建新单词
    if (!wordCollectInfo && collectInputBasic) {
      // 检查单词是否已存在
      if (
        hasWord({ word: searchText, swwList: (await getLocal()).swwList ?? [] })
      ) {
        toastManager.add({ type: "error", msg: "the word already existed" });
        return;
      }
      
      item = {
        id: uuidv4(),
        lastEditDate: Date.now(),
        ...collectInputBasic,
      };
      addSww(item);
    }

    // ============ 备注部分处理 ============

    // 情况3：删除备注（清空内容时）
    if (
      wordRemarkInfo.id &&
      !collectInputRemark.content &&
      !collectInputRemark?.imgs?.length
    ) {
      deleteCommunity({ id: wordRemarkInfo.id });
      setRemarkList((draft) => {
        const index = draft.findIndex((item) => item.id === wordRemarkInfo.id);
        if (index !== -1) {
          draft.splice(index, 1);
        }
      });
      removeRemark({ id: wordRemarkInfo.id });
    }
    
    // 情况4：更新现有备注
    if (
      wordRemarkInfo.id &&
      (collectInputRemark.content || collectInputRemark?.imgs?.length)
    ) {
      let urls: string[] = [];
      if (collectInputRemark?.imgs && collectInputRemark?.imgs.length) {
        urls = await uploadMultiBase64(collectInputRemark.imgs);
      }
      
      const editItem = {
        id: wordRemarkInfo.id,
        word: collectInputBasic!.word,
        context: collectInputBasic!.context,
        author: setting.userInfo!.email,
        type: 'remark' as CommunityType,
        content: collectInputRemark?.content ?? "",
        imgs: urls,
        lastEditDate: Date.now(),
      };
      
      editItemContent(editItem);
      setRemarkList((draft) => {
        const index = draft.findIndex(
          (item) => item.id === collectInputRemark.id
        );
        if (index !== -1) {
          draft[index].imgs = urls;
          draft[index].content = collectInputRemark?.content ?? "";
          draft[index].lastEditDate = Date.now();
        }
      });
      updateRemark(editItem);
    }

    // 情况5：创建新备注
    if (!wordRemarkInfo.id && (collectInputRemark.content || collectInputRemark.imgs?.length)) {
      let urls: string[] = [];
      if (collectInputRemark?.imgs && collectInputRemark?.imgs?.length) {
        urls = await uploadMultiBase64(collectInputRemark.imgs);
      }
      
      const communityItem: CommunityItemType = {
        id: uuidv4(),
        word: wordCollectInfo?.word || currentSelectionInfo.word || searchText,
        context: wordCollectInfo?.context || currentSelectionInfo.context || searchText,
        author: setting.userInfo!.email,
        content: collectInputRemark.content ?? '',
        imgs: urls,
        lastEditDate: Date.now(),
        type: "remark" as CommunityType,
      };
      
      addCommunity(communityItem);
      setRemarkList((draft) => {
        draft.push(communityItem);
      });
      addRemark(communityItem);
    }

    // 关闭收集表单
    setCollectShow(false);
  };

  // ===================== 主渲染逻辑 =====================

  /** 检测是否为单词模式 */
  const isWordResult = isWord({
    input: searchText,
    lang: setting.sourceLanguage?.language,
  });

  /** 如果没有选中的引擎，显示为null */
  if (!currentEngine) {
    return null;
  }

  return (
    <div ref={divRef} className="max-h-[70vh] overflow-scroll">
      {/* 引擎选择下拉菜单 */}
      <EngineDropdown
        isWord={isWordResult}
        currentEngine={currentEngine}
        onChange={(engine) => setCurrentEngine(engine)}
        className={`absolute ${
          isInPopup
            ? "right-0 bg-gray-300/60 rounded-xl text-[11px] p-[3px] top-[0px]"
            : "right-16 text-[13px]"
        } top-[5px] z-10`}
      />

      {/* 错误边界包装 */}
      <ErrorBoundary
        FallbackComponent={(fallbackProps) => (
          <FallbackComponent
            ref={fallbackComRef}
            fallbackProps={fallbackProps}
          />
        )}
      >
        {isWordResult ? (
          // 单词模式：显示单词详情组件
          <Word
            onPencilClick={handlePencilClick}
            onMasterClick={handleMasterClick}
            onHeartClick={handleHeartClick}
            onWeightChange={handleWeightChange}
            collectInfo={wordCollectInfo}
            remarkInfo={wordRemarkInfo}
            searchText={searchText}
            currentEngine={currentEngine}
            onRefresh={() => onRefresh("word")}
            key={wordV}
          />
        ) : (
          // 句子模式：显示翻译组件
          <Translate
            currentEngine={currentEngine}
            onPencilClick={handlePencilClick}
            onMasterClick={handleMasterClick}
            onHeartClick={handleHeartClick}
            collectInfo={wordCollectInfo}
            remarkInfo={wordRemarkInfo}
            searchText={searchText}
            onRefresh={() => onRefresh("translate")}
            key={translateV}
          />
        )}
      </ErrorBoundary>

      {/* 登录组件 */}
      <Login />

      {/* Content Script模式：Portal渲染收集表单 */}
      {!isInPopup && contentScriptWrapper && collectShow
        ? createPortal(
            <CollectModal>
              <CollectForm
                onSubmit={handleCollectSubmit}
                onCancel={() => setCollectShow(false)}
              />
            </CollectModal>,
            contentScriptWrapper
          )
        : null}

      {/* Popup模式：Portal渲染收集表单 */}
      {isInPopup && collectShow
        ? createPortal(
            <div className="p-3">
              <CollectForm
                size="sm"
                showCloseIcon={true}
                onSubmit={handleCollectSubmit}
                onCancel={() => setCollectShow(false)}
              />
            </div>,
            document.querySelector("#collect-wrapper")!
          )
        : null}
    </div>
  );
}
