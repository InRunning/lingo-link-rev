/**
 * 全局状态（jotai）
 * - settingAtom：与 storage.sync 同步的设置；
 * - swwListAtom：本地生词本（storage.local）列表；
 * - 若干 action atom：新增/删除/更新生词，驱动 API 与本地存储同步。
 */
import { CollectRemarkInfo, CollectBasicInfo, Setting } from "@/types";
import { atom } from "jotai";
import { CommunityItemType, Sww } from "./types/words";
import { getSetting as getSettingStorage, setSetting as  setSettingStorage} from "./storage/sync";
import { addSwwApi, removeWordApi, updateWordApi } from "./api";
import { removeWord as removeStorageWord, updateWord as updateStorageWord, addWord as addStorageWord } from "@/storage/local";
import { addWordOulu, removeWordOulu } from "./api/oulu";
import { getList as getStorageSwwList, getRemarkList } from "@/storage/local";

const _settingAtom = atom<Setting|Record<string,never>>({})
export const swwListAtom = atom<Sww[]>([])
swwListAtom.onMount = (setAtom) => {
  getStorageSwwList().then(res => {
    setAtom(res)
  })
}
/**
 * 设置原子：读写合并，并持久化到 storage.sync
 */
export const settingAtom = atom((get)=>{
  return get(_settingAtom)
},(get,set,update:Partial<Setting>) => {
  const setting = get(
    _settingAtom);
  set(_settingAtom, {...setting, ...update});
  setSettingStorage(update)
})
settingAtom.onMount = (setAtom)=>{
  getSettingStorage().then((res) => {
    setAtom(res)
  })
}
/** 新增生词：调用后端 + 本地缓存 + 欧路同步 */
export const addSwwAtom = atom(null,(get,set,sww:Sww) => {
  addSwwApi(sww);
  addStorageWord(sww)
  addWordOulu(sww.word)
  set(swwListAtom, [...get(swwListAtom), sww])
})
/** 删除生词：调用后端 + 本地缓存 + 欧路同步 */
export const removeSwwAtom = atom(null,(get,set,sww:Sww) => {
  removeWordApi(sww.word);
  removeStorageWord({word: sww.word});
  removeWordOulu(sww.word)
  set(swwListAtom, get(swwListAtom).filter(item => item.id !== sww.id))
})
/** 更新生词：主记忆等级/上下文等 */
export const updateSwwItemAtom = atom(null,(get,set,update:Sww) => {
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
  getRemarkList().then(res => {
    setAtom(res)
  })
}
