/**
 * chrome.storage.local 封装
 * - 保存与设备相关的本地数据（生词本、社区备注、本地缓存模型列表等）
 * - 提供单词和备注的CRUD操作
 * - 使用Promise封装chrome.storage.local API，支持异步操作
 */
import type { CommunityItemType, Sww } from "@/types/words";
import { Local } from "@/types";
import { isSameWord } from "@/utils";
import browser from "webextension-polyfill";

// ===================== 本地存储核心操作 =====================

/**
 * 获取本地存储的所有数据
 * @returns Promise<Local> 包含完整本地数据的对象
 */
export const getLocal = async(): Promise<Local>=>{
  return await browser.storage.local.get();
}

/**
 * 设置本地存储数据
 * @param param - Partial<Local> 要设置的本地数据
 * @returns Promise<void>
 */
export const setLocal = async(param: Partial<Local>)=>{
  return browser.storage.local.set(param);
}

/**
 * 清空所有本地存储数据
 * @returns Promise<void>
 */
export const clearLocal = async()=>{
  return browser.storage.local.clear();
}

// ===================== 单词管理操作 =====================

/**
 * 添加新单词到生词本
 * @param sww - Sww 要添加的单词对象
 * @returns Promise<void>
 */
export const addWord = async (sww: Sww) => {
  const swwList = (await getLocal())?.swwList ?? [];
  setLocal({swwList: [...swwList, sww]})
};

/**
 * 更新现有单词信息
 * @param sww - Sww 包含更新信息的单词对象
 * @returns Promise<void>
 */
export const updateWord = async(sww: Sww) => {
  const swwList = (await getLocal())?.swwList ?? [];
  setLocal({swwList:(
    swwList.map((item) => {
      if (isSameWord(item.word, sww.word)) {
        // 找到匹配的单词，合并新数据
        return { ...item, ...sww  };
      } else {
        return item;
      }
    })
  )});
};

/**
 * 删除指定单词
 * @param param - { word: string } 要删除的单词
 * @returns Promise<void>
 */
export const removeWord = async({ word }: { word: string; }) => {
  const swwList = (await getLocal())?.swwList ?? [];
  // 过滤掉匹配的单词
  setLocal({swwList: (swwList.filter((item) => !isSameWord(item.word, word)))});
};

// ===================== 单词列表查询操作 =====================

/**
 * 获取完整的单词列表
 * @returns Promise<Sww[]> 单词列表
 */
export const getList = async () => {
  return (await getLocal()).swwList ?? []
}

/**
 * 获取备注列表
 * @returns Promise<CommunityItemType[]> 备注列表
 */
export const getRemarkList = async () => {
  return (await getLocal()).remarkList ?? []
}

// ===================== 备注管理操作 =====================

/**
 * 添加新备注
 * @param item - CommunityItemType 要添加的备注对象
 * @returns Promise<void>
 */
export const addRemark = async (item: CommunityItemType) => {
  const remarkList = (await getLocal())?.remarkList ?? [];
  setLocal({remarkList: [...remarkList, item]})
};

/**
 * 更新现有备注
 * @param item - CommunityItemType 包含更新信息的备注对象
 * @returns Promise<void>
 */
export const updateRemark = async(item: CommunityItemType) => {
  const remarkList = (await getLocal())?.remarkList ?? [];
  setLocal({remarkList:(
    remarkList.map((im) => {
      if (item.id === im.id) {
        // 找到匹配的备注，合并新数据
        return { ...im, ...item  };
      } else {
        return im;
      }
    })
  )});
};

/**
 * 删除指定备注
 * @param param - { id: string } 要删除的备注ID
 * @returns Promise<void>
 */
export const removeRemark = async({ id }: { id: string; }) => {
  const remarkList = (await getLocal())?.remarkList ?? [];
  // 过滤掉匹配的备注
  setLocal({remarkList: (remarkList.filter((item) => item.id !== id))});
};
