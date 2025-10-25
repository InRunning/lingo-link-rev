/**
 * 页面：扩展设置（通用）
 * - 账户登录/退出、触发图标、界面语言、选中文本触发方式等基础设置
 * - 依赖 jotai 全局 `settingAtom`，通过 `setSetting` 落盘到 `chrome.storage.sync`
 * - 支持多语言界面，基于 react-i18next 实现国际化
 * - 包含完整的用户偏好设置界面
 */
import type { InterfaceLanguage } from "@/types";
import {
  AllLanguage,
  HighlightName,
  LangCode,
  SourceLanguage,
  defaultSetting,
  highlightStyles,
} from "@/utils/const";
import Login, { showLogin } from "@/components/Login";
import { useEffect } from "react";
import { setLocal } from "@/storage/local";
import { useTranslation } from "react-i18next";
import { getSession, setSession } from "@/storage/session";
import triggerIcon from "@/assets/trigger.png";
import { upload } from "@/api";
import browser from "webextension-polyfill";
import type { Storage } from "webextension-polyfill";
import { useAtom } from "jotai";
import { settingAtom } from "@/store";
import HotkeysInput from "./hotkeyInput";

/** 默认触发图标的资源路径 */
const defaultTriggerUrl = new URL(triggerIcon, import.meta.url).href;

/**
 * 扩展设置页面主组件
 * 提供用户界面配置、账户管理、交互设置等核心功能
 * @returns 设置页面React组件
 */
export default function Options() {
  const { t, i18n } = useTranslation();
  
  // ===================== 全局状态管理 =====================
  
  /** 扩展设置状态 */
  const [setting, setSetting] = useAtom(settingAtom);

  /**
   * 处理源语言选择变更
   * 更新翻译源语言的设置选项
   * @param e - HTML选择框变更事件
   */
  const handleSourceLanguageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const item = AllLanguage.find((sub) => sub.language === e.target.value);
    setSetting({ sourceLanguage: item });
  };

  // ===================== 会话监听处理 =====================

  /**
   * 登录会话监听Effect
   * 监听session存储的变化，显示登录对话框
   */
  useEffect(() => {
    // 初始化时检查是否需要显示登录
    getSession().then((res) => {
      if (res.showLogin) {
        setTimeout(() => {
          showLogin();
        }, 100);
        setSession({ showLogin: false });
      }
    });

    /**
     * session存储变更监听器
     * 当showLogin标志被设置时，自动显示登录对话框
     */
    const handleSessionChange = (
      changes: Storage.StorageAreaOnChangedChangesType
    ) => {
      if (changes.showLogin && changes.showLogin.newValue) {
        setTimeout(() => {
          showLogin();
        }, 100);
        setSession({ showLogin: false });
      }
    };

    browser.storage.session.onChanged.addListener(handleSessionChange);

    // 清理：移除事件监听器
    return () => {
      browser.storage.session.onChanged.removeListener(handleSessionChange);
    };
  }, []);

  // ===================== 国际化处理 =====================

  /**
   * 界面语言切换Effect
   * 当用户修改界面语言时，同步更新i18next设置
   */
  useEffect(() => {
    if (setting.interfaceLanguage !== i18n.language) {
      i18n.changeLanguage(
        setting.interfaceLanguage ?? defaultSetting.interfaceLanguage
      );
    }
  }, [i18n, setting.interfaceLanguage]);

  // ===================== 用户交互处理 =====================

  /**
   * 切换登录状态
   * - 未登录：显示登录对话框
   * - 已登录：退出并清空本地数据
   */
  const toogleLogIn = () => {
    if (!setting.userInfo?.email) {
      // 用户未登录：显示登录对话框
      showLogin();
    } else {
      // 用户已登录：退出并清空本地单词列表
      setSetting({userInfo: null});
      setLocal({ swwList: [] });
    }
  };

  /**
   * 切换界面语言
   * @param lang - 新的语言代码
   */
  const changeI18nLang = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  /**
   * 处理图标文件上传
   * 将用户选择的图片上传到云存储并更新设置
   * @param event - 文件输入变更事件
   */
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files) {
      const file = event.target.files[0];
      const json = await upload(file);
      const url = "https://r2.mywords.cc/" + json.key;
      setSetting({
        triggerIcon: url
      });
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-9">
        {/* ===================== 账户管理区域 ===================== */}
        <div>
          {<div className="font-semibold text-[17px] mb-2">{t("Account")}</div>}
          <div>
            {/* 用户邮箱显示 */}
            {
              <span className="mr-2">
                {setting.userInfo?.email || t("Not Logged In State")}
              </span>
            }
            {/* 登录/退出按钮 */}
            <button
              onClick={toogleLogIn}
              className={`btn btn-sm ${
                !setting.userInfo?.email ? "btn-primary" : ""
              }`}
            >
              {setting.userInfo?.email ? t("Sign out") : t("Sign in")}
            </button>
          </div>
        </div>

        {/* ===================== 交互设置区域 ===================== */}
        
        {/* 显示触发图标开关 */}
        <label>
          <div className="font-semibold text-[17px] mb-2">
            {t("Display Trigger Icon After Highlighting Text")}
          </div>
          <div className="flex items-center">
            <input
                type="checkbox"
                onChange={(e) => {
                  setSetting({
                    showSelectionIcon: e.target.checked,
                  });
                }}
                checked={
                    setting.showSelectionIcon ?? defaultSetting.showSelectionIcon
                }
                className="checkbox"
            />
          </div>
        </label>

        {/* 快捷键设置 */}
        <div>
          <div className="font-semibold text-[17px] mb-2">
            {t("Translate after selecting text and pressing a shortcut key")}
          </div>
          <div className="flex items-center">
            <HotkeysInput />
          </div>
        </div>

        {/* ===================== 自动保存设置 ===================== */}
        
        {/* 自动保存单词开关 */}
        <label>
          <div className="font-semibold text-[17px] mb-2">
            {t("Auto Save Word When Searching")}
          </div>
          <div className="flex items-center">
            <input
                type="checkbox"
                onChange={(e) => {
                  // 如果启用自动保存但用户未登录，显示登录对话框
                  if (e.target.checked && !setting.userInfo) {
                    showLogin()
                  } else {
                    setSetting({
                      autoSaveWord: e.target.checked,
                    });
                  }
                }}
                checked={
                    setting.autoSaveWord ?? defaultSetting.autoSaveWord
                }
                className="checkbox"
            />
          </div>
        </label>

        {/* ===================== 触发图标设置 ===================== */}
        
        {/* 触发图标上传 */}
        <div>
          <div className="font-semibold text-[17px] mb-2">
            {t("Trigger Icon")}
          </div>
          <div className="flex items-center">
            <label className="w-[70px] h-[70px] relative group">
              <img
                  className="w-full"
                  src={setting.triggerIcon ?? defaultTriggerUrl}
                  alt=""
              />
              <input
                  onChange={handleFileChange}
                  type="file"
                  accept="image/*"
                  id="fileInput"
                  className="hidden"
              />
              <div className="group-hover:opacity-100 opacity-0 cursor-pointer absolute inset-0 text-white/80 bg-black/50 z-10 flex items-center justify-center">
                {t("upload")}
              </div>
            </label>
          </div>
        </div>

        {/* 触发图标大小设置 */}
        <label>
          <div className="font-semibold text-[17px] mb-2">
            {t("Trigger Icon Size")}
          </div>
          <div className="flex items-center">
            <input
              onChange={(e) => {
                setSetting({
                  triggerIconSize: Number(e.target.value),
                });
              }}
              value={setting.triggerIconSize ?? defaultSetting.triggerIconSize}
              className="input input-bordered"
              type="number"
            />
          </div>
        </label>

        {/* ===================== 高亮样式设置 ===================== */}
        
        {/* 高亮颜色设置 */}
        <div>
          <div className="font-semibold text-[17px] mb-2">
            {t("Highlight Color")}
          </div>
          <div className="flex items-center">
            <input
                type="color"
                className="rounded-sm cursor-pointer"
                value={setting.highlightColor ?? defaultSetting.highlightColor}
                onChange={(e) => {
                  setSetting({
                    highlightColor: e.target.value,
                  });
                }}
            />
          </div>
        </div>

        {/* 高亮样式选择 */}
        <label>
          <div className="font-semibold text-[17px] mb-2">
            {t("Highlight Style")}
          </div>
          <select
              value={setting.highlightStyle ?? defaultSetting.highlightStyle}
              onChange={(e) => {
                setSetting({
                  highlightStyle: e.target.value as HighlightName,
                });
              }}
              className="select select-bordered w-full"
          >
            {highlightStyles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
            ))}
          </select>
        </label>

        {/* ===================== 语音设置 ===================== */}
        
        {/* 自动发音开关 */}
        <label>
          <div className="font-semibold text-[17px] mb-2">
            {t("Automatically pronounce the word when looking it up")}
          </div>
          <div className="flex items-center">
            <input
                type="checkbox"
                onChange={(e) => {
                  setSetting({
                    autoPronounce: e.target.checked,
                  });
                }}
                checked={setting.autoPronounce}
                className="checkbox"
            />
          </div>
        </label>

        {/* ===================== 语言设置 ===================== */}
        
        {/* 界面语言选择 */}
        <label>
          <div className="font-semibold text-[17px] mb-2">
            {t("Interface Language")}
          </div>
          <select
              value={
                  setting.interfaceLanguage ?? defaultSetting.interfaceLanguage
              }
              onChange={(e) => {
                changeI18nLang(e.target.value);
                setSetting({
                  interfaceLanguage: e.target.value as InterfaceLanguage,
                });
              }}
              className="select select-bordered w-full"
          >
            <option value={"zh"}>简体中文</option>
            <option value={"en"}>English</option>
          </select>
        </label>

        {/* 源语言选择 */}
        <div>
          <div className="font-semibold text-[17px] mb-2">
            {t("Language to be Translated")}
          </div>
          <div className="flex space-x-5">
            <select
                value={
                    setting.sourceLanguage?.language ??
                    defaultSetting.sourceLanguage.language
                }
                onChange={handleSourceLanguageChange}
                className="select select-bordered w-full"
            >
              {SourceLanguage.map((item) => (
                <option key={item.language} value={item.language}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 目标语言选择 */}
        <label>
          <div className="font-semibold text-[17px] mb-2">
            {t("Native Language")}
          </div>
          <select
              value={setting.targetLanguage ?? defaultSetting.targetLanguage}
              onChange={(e) => {
                setSetting({
                  targetLanguage: e.target.value as LangCode,
                });
              }}
              className="select select-bordered w-full"
          >
            {AllLanguage.map((item) => (
                <option key={item.language} value={item.language}>
                  {item.name}
                </option>
            ))}
          </select>
        </label>
      </div>
      
      {/* 登录组件 */}
      <Login/>
    </div>
  );
}
