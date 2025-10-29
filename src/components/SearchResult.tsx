/**
 * 搜索结果内容组件 (Search Result Content Component)
 *
 * 功能说明：
 * - 主翻译界面组件，负责显示单词/句子查询结果
 * - 集成收藏、备注、引擎切换等完整功能
 * - 支持自动保存、社区备注等高级功能
 * - 处理popup和contentScript两种显示环境
 */

// 导入工具函数
import { getCollectWord, isSameWord } from "../utils";
import { useState, useEffect, useRef } from "react";
// 导入类型定义
import type { CommunityItemType, CommunityType, Sww } from "@/types/words";
// 导入子组件
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
// 导入状态管理
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
// 导入浏览器扩展API和工具
import Browser from "webextension-polyfill";
import { setSession } from "@/storage/session";
import { createPortal } from "react-dom";
// 导入收藏相关组件
import CollectModal from "./CollectModal";
import CollectForm from "./CollectForm";
import { v4 as uuidv4 } from "uuid";
import { hasWord } from "../utils";
// 导入本地存储操作
import {
  getLocal,
  addRemark,
  removeRemark,
  updateRemark,
} from "@/storage/local";
import { toastManager } from "./Toast";
// 导入API操作
import {
  addCommunity,
  deleteCommunity,
  editItemContent,
  uploadMultiBase64,
} from "@/api";
import { useImmerAtom } from "jotai-immer";
import { getSetting } from "@/storage/sync";

export default function TranslateContent({
  searchText,
}: {
  searchText: string;
}) {
  // 全局生词列表（用于判断是否已收藏/掌握）可能是 Study word with的缩写
  const [swwList] = useAtom(swwListAtom);
  // 原子写操作：添加/移除/更新 生词项
  const [, addSww] = useAtom(addSwwAtom);
  const [, removeSww] = useAtom(removeSwwAtom);
  const [, updateSww] = useAtom(updateSwwItemAtom);
  // 全局设置（语言、引擎、自动保存等）
  const [setting] = useAtom(settingAtom);
  // 社区备注列表（ Immer 原子用于便捷更新）
  const [remarkList, setRemarkList] = useImmerAtom(remarkListAtom);
  const [collectInputBasic, setCollectBasicInfo] = useAtom(
    collectInputBasicAtom
  );
  const [collectInputRemark, setCollectInputRemark] = useAtom(
    collectInputRemarkAtom
  );
  // 当前选择的引擎（单词/句子模式下各有独立列表）
  const [currentEngine, setCurrentEngine] = useState<EngineValue | null>(null);
  // 当前单词的收藏信息（若存在则含 id/权重/熟练度等）
  const [wordCollectInfo, setCurrentCollect] = useState<Sww | undefined>(
    undefined
  );
  // 当前单词的社区备注信息（可为空）
  const [wordRemarkInfo, setWordRemarkInfo] = useState<
    Partial<CommunityItemType>
  >({});
  // 是否显示收藏弹窗；内容脚本环境下需要 portal 到宿主容器
  const [collectShow, setCollectShow] = useAtom(collectShowAtom);
  const [contentScriptWrapper, setContentScriptWrapper] =
    useState<HTMLDivElement | null>(null);
  // 强制刷新 key：用于重挂载组件，避免内部状态残留
  const [translateV, setTranslateV] = useState(0);
  const [wordV, setWordV] = useState(0);
  const divRef = useRef<HTMLDivElement | null>(null);
  const fallbackComRef =
    useRef<React.ComponentRef<typeof FallbackComponent>>(null);
  const showCollectForm = () => {
    if (isInPopup) {
      setCollectShow(true);
    } else {
      // 在内容脚本中，通过 shadowRoot 查找容器并使用 createPortal
      const root = divRef.current?.getRootNode() as HTMLElement;
      setCollectShow(true);
      setContentScriptWrapper(
        root.querySelector("#orange-translator-container") as HTMLDivElement
      );
    }
  };
  useEffect(() => {
    // 根据输入判断单词/句子模式，并从对应引擎列表中选第一个“勾选”的引擎
    const isWordResult = isWord({
      input: searchText,
      lang: setting.sourceLanguage?.language,
    });
    if (isWordResult) {
      const list = setting.wordEngineList ?? allWordEngineList;
      if (list && list instanceof Array && list.length) {
        setCurrentEngine(list.filter((item) => item.checked)[0].value);
      } else {
        setCurrentEngine(allWordEngineList[0].value);
      }
    } else {
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
  useEffect(() => {
    // 切换引擎时清除错误态
    fallbackComRef.current?.hideError();
  }, [currentEngine]);
  useEffect(() => {
    // 计算收藏信息，并预填收藏表单的基础信息
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
  useEffect(() => {
    // 绑定最近的一条社区备注（如无则清空）
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
  useEffect(() => {
    // 自动收藏逻辑：满足条件时加入本地与远端收藏
    let ignore = false;
    Promise.all([getSetting(), getLocal()]).then(res => {
      if (ignore) { return }
      const setting = res[0];
      const swwList = res[1].swwList;
      const isWordResult = isWord({
        input: searchText,
        lang: setting.sourceLanguage?.language,
      });
      if (!isWordResult) { return }
      if (!setting.autoSaveWord) { return }
      if (!setting.userInfo) { return }
      if (!swwList?.find(item => isSameWord(item.word, searchText))) {
        const item = {
          id: uuidv4(),
          lastEditDate: Date.now(),
          word: searchText,
          context: currentSelectionInfo.context ?? searchText
        };
        addSww(item)
      }
    })

    return () => {
      // 防止竞态：依赖变化/卸载后忽略异步落回
      ignore = true
    }
  }, [searchText, addSww])
  const handleHeartClick = async () => {
    if (!setting.userInfo?.token) {
      if (isInPopup) {
        setSession({ showLogin: true });
        Browser.runtime.openOptionsPage();
      } else {
        showLogin();
      }
      return;
    }
    if (wordCollectInfo?.id) {
      removeSww(wordCollectInfo);
    } else {
      showCollectForm();
    }
  };
  const handleMasterClick = () => {
    // 切换“已掌握”标记（1 表示已掌握）
    const newLevel = wordCollectInfo?.masteryLevel === 1 ? 0 : 1;
    updateSww({ ...wordCollectInfo!, ...{ masteryLevel: newLevel } });
  };
  const handleWeightChange = (num: number) => {
    if (!wordCollectInfo) {
      return;
    }
    // 更新生词权重：用于排序/优先级控制
    updateSww({ ...wordCollectInfo, ...{ weight: num } });
  };
  const handlePencilClick = () => {
    showCollectForm();
  };
  const onRefresh = (type: "translate" | "word") => {
    if (type === "translate") {
      // 重新渲染 Translate 区域
      setTranslateV((pre) => ++pre);
    } else {
      // 重新渲染 Word 区域
      setWordV((pre) => ++pre);
    }
  };

  const handleCollectSubmit = async () => {
    let item: Sww | null = null;
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
    if (!wordCollectInfo && collectInputBasic) {
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
    // remark section

    // 备注为空 -> 删除社区备注（本地与远端）
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

    // 备注存在 -> 更新内容与图片（本地与远端）
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
    // 新备注 -> 创建社区备注（本地与远端）
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
    setCollectShow(false);
  };
  const isWordResult = isWord({
    input: searchText,
    lang: setting.sourceLanguage?.language,
  });
  if (!currentEngine) {
    return null;
  }
  return (
    <div ref={divRef} className="max-h-[70vh] overflow-scroll">
      <EngineDropdown
        isWord={isWordResult}
        currentEngine={currentEngine}
        onChange={(engine) => setCurrentEngine(engine)}
        className={`absolute ${isInPopup
            ? "right-0 bg-gray-300/60 rounded-xl text-[11px] p-[3px] top-[0px]"
            : "right-16 text-[13px]"
          } top-[5px] z-10`}
      />

      <ErrorBoundary
        FallbackComponent={(fallbackProps) => (
          <FallbackComponent
            ref={fallbackComRef}
            fallbackProps={fallbackProps}
          />
        )}
      >
        {isWordResult ? (
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
      <Login />
      {!isInPopup && contentScriptWrapper && collectShow
        ? createPortal(
          <CollectModal>
            <CollectForm
              onSubmit={handleCollectSubmit}
              onCancel={() => setCollectShow(false)}
            ></CollectForm>
          </CollectModal>,
          contentScriptWrapper
        )
        : null}
      {isInPopup && collectShow
        ? createPortal(
          <div className="p-3">
            <CollectForm
              size="sm"
              showCloseIcon={true}
              onSubmit={handleCollectSubmit}
              onCancel={() => setCollectShow(false)}
            ></CollectForm>
          </div>,
          document.querySelector("#collect-wrapper")!
        )
        : null}
    </div>
  );
}
/**
 * 搜索结果面板：展示单词/句子查询结果与操作
 * @param searchText - 当前查询文本
 * 交互说明：
 * - 根据输入判断走“单词模式”或“句子模式”，渲染不同结果区
 * - 选择引擎后刷新结果，并允许切换收藏/外链/发音等操作
 */
