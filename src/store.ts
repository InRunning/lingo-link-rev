/**
 * 全局状态管理模块 - 使用 Jotai 轻量级状态管理
 *
 * 设计原则：
 * - 仅存放跨页面/脚本共享的最小状态与操作
 * - 避免状态臃肿，保持状态管理的简洁性
 * - 使用原子化设计，每个状态都是独立的
 */

// 导入类型定义
import { CollectRemarkInfo, CollectBasicInfo, Setting } from "@/types";
// 导入 Jotai 核心函数，用于创建原子状态
import { atom } from "jotai";
// 导入单词相关类型定义
import { CommunityItemType, Sww } from "./types/words";
// 导入设置相关的存储操作函数
import { getSetting as getSettingStorage, setSetting as  setSettingStorage} from "./storage/sync";
// 导入API操作函数，用于与后端交互
import { addSwwApi, removeWordApi, updateWordApi } from "./api";
// 导入本地存储操作函数
import { removeWord as removeStorageWord, updateWord as updateStorageWord, addWord as addStorageWord } from "@/storage/local";
// 导入欧路词典相关的API操作
import { addWordOulu, removeWordOulu } from "./api/oulu";
// 导入本地存储的获取函数
import { getList as getStorageSwwList, getRemarkList } from "@/storage/local";

// 用户设置原子：保存并同步扩展的 Setting
const _settingAtom = atom<Setting|Record<string,never>>({})
// 创建一个名为 swwListAtom 的原子状态，用于存储单词列表（Sww[]类型）
// atom() 是 Jotai 状态管理库的核心函数，用于创建可响应的状态原子
// 初始值为空数组 []
export const swwListAtom = atom<Sww[]>([])

// onMount 是 Jotai 原子的生命周期钩子函数
// 当这个原子状态第一次被组件订阅时，onMount 会被自动执行
// 这是一种懒初始化机制，只有当实际需要时才加载数据
swwListAtom.onMount = (setAtom) => {
  // 初始化：从浏览器本地存储加载单词列表
  // getStorageSwwList() 返回一个 Promise，解析为存储的单词列表
  getStorageSwwList().then(res => {
    // setAtom 是用于更新原子状态的函数
    // 将从本地存储获取的单词列表设置为 swwListAtom 的当前值
    setAtom(res)
  })
}
export const settingAtom = atom((get)=>{
  return get(_settingAtom)
},(get,set,update:Partial<Setting>) => {
  // 写入：合并并持久化部分设置更新
  const setting = get(
    _settingAtom);
  set(_settingAtom, {...setting, ...update});
  setSettingStorage(update)
})
settingAtom.onMount = (setAtom)=>{
  // 初始化：从同步存储载入用户设置
  getSettingStorage().then((res) => {
    setAtom(res)
  })
}
export const addSwwAtom = atom(null,(get,set,sww:Sww) => {
  // 添加单词：同时写入远端与本地缓存，并更新列表
  addSwwApi(sww);
  addStorageWord(sww)
  addWordOulu(sww.word)
  set(swwListAtom, [...get(swwListAtom), sww])
})
export const removeSwwAtom = atom(null,(get,set,sww:Sww) => {
  // 移除单词：同步删除远端与本地，并刷新列表
  removeWordApi(sww.word);
  removeStorageWord({word: sww.word});
  removeWordOulu(sww.word)
  set(swwListAtom, get(swwListAtom).filter(item => item.id !== sww.id))
})
export const updateSwwItemAtom = atom(null,(get,set,update:Sww) => {
  // 更新单词：提升熟练度、修正文案等；保持三端一致
  set(swwListAtom, get(swwListAtom).map(item => {
    if (item.id === update.id) {
      updateWordApi({id:update.id,masteryLevel:update.masteryLevel,word:update.word,context:update.context});
      updateStorageWord(update)
      return update
    } else {
      return item
    }
  }))
})
export const collectShowAtom = atom(false)
export const collectInputBasicAtom = atom<CollectBasicInfo|undefined>(undefined)
export const collectInputRemarkAtom = atom<CollectRemarkInfo>({} as CollectRemarkInfo)
export const remarkListAtom = atom<CommunityItemType[]>([]);
remarkListAtom.onMount = (setAtom) => {
  // 初始化：社区例句与备注列表
  getRemarkList().then(res => {
    setAtom(res)
  })
}
