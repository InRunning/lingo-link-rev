// 全局状态管理（Jotai 轻量原子）
// 约定：仅存放跨页面/脚本共享的最小状态与操作，避免臃肿
import { CollectRemarkInfo, CollectBasicInfo, Setting } from "@/types";
import { atom } from "jotai";
import { CommunityItemType, Sww } from "./types/words";
import { getSetting as getSettingStorage, setSetting as  setSettingStorage} from "./storage/sync";
import { addSwwApi, removeWordApi, updateWordApi } from "./api";
import { removeWord as removeStorageWord, updateWord as updateStorageWord, addWord as addStorageWord } from "@/storage/local";
import { addWordOulu, removeWordOulu } from "./api/oulu";
import { getList as getStorageSwwList, getRemarkList } from "@/storage/local";

// 用户设置原子：保存并同步扩展的 Setting
const _settingAtom = atom<Setting|Record<string,never>>({})
export const swwListAtom = atom<Sww[]>([])
swwListAtom.onMount = (setAtom) => {
  // 初始化：从本地存储加载单词列表
  getStorageSwwList().then(res => {
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
