import type { InterfaceLanguage } from "@/types";
import {
  AllLanguage,
  HighlightName,
  LangCode,
  SourceLanguage,
  defaultSetting, highlightStyles,
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

// 默认触发器图标URL
const defaultTriggerUrl = new URL(triggerIcon, import.meta.url).href;

/**
 * 选项页面组件
 * 提供用户设置界面，包括账户、翻译、高亮、界面语言等配置选项
 */
export default function Options() {
  // 国际化翻译钩子
  const { t, i18n } = useTranslation();
  // 使用Jotai状态管理获取设置
  const [setting, setSetting] = useAtom(settingAtom);

  /**
   * 处理源语言变更
   * @param e 选择框变更事件
   */
  const handleSourceLanguageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const item = AllLanguage.find((sub) => sub.language === e.target.value);
    setSetting({ sourceLanguage: item });
  };
  /**
   * 检查并处理登录状态
   * 监听会话存储变化，如果需要登录则显示登录弹窗
   */
  useEffect(() => {
    // 检查当前会话是否需要登录
    getSession().then((res) => {
      if (res.showLogin) {
        setTimeout(() => {
          showLogin();
        }, 100);
        setSession({ showLogin: false });
      }
    });
    
    // 监听会话存储变化
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

    // 清理函数：移除事件监听器
    return () => {
      browser.storage.session.onChanged.removeListener(handleSessionChange);
    };
  }, []);
  /**
   * 监听界面语言设置变化并更新国际化语言
   */
  useEffect(() => {
    if (setting.interfaceLanguage !== i18n.language) {
      i18n.changeLanguage(
        setting.interfaceLanguage ?? defaultSetting.interfaceLanguage
      );
    }
  }, [i18n, setting.interfaceLanguage]);

  /**
   * 切换登录状态
   * 如果未登录则显示登录弹窗，如果已登录则退出登录
   */
  const toogleLogIn = () => {
    if (!setting.userInfo?.email) {
      showLogin();
    } else {
      // 退出登录：清除用户信息和生词列表
      setSetting({userInfo: null});
      setLocal({ swwList: [] });
    }
  };

  /**
   * 更改界面语言
   * @param lang 目标语言代码
   */
  const changeI18nLang = (lang: string) => {
    i18n.changeLanguage(lang);
  };
  /**
   * 处理文件上传事件
   * 上传用户自定义的触发器图标
   * @param event 文件选择事件
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
        {/* 账户设置区域 */}
        <div>
          <div className="font-semibold text-[17px] mb-2">{t("Account")}</div>
          <div>
            <span className="mr-2">
              {setting.userInfo?.email || t("Not Logged In State")}
            </span>
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
        {/* 显示触发器图标设置 */}
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
        {/* 快捷键翻译设置 */}
        <div>
          <div className="font-semibold text-[17px] mb-2">
            {t("Translate after selecting text and pressing a shortcut key")}
          </div>
          <div className="flex items-center">
            <HotkeysInput />
          </div>
        </div>
        {/* 自动保存单词设置 */}
        <label>
          <div className="font-semibold text-[17px] mb-2">
            {t("Auto Save Word When Searching")}
          </div>
          <div className="flex items-center">
            <input
                type="checkbox"
                onChange={(e) => {
                  // 如果开启自动保存但未登录，则显示登录弹窗
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
        {/* 触发器图标设置 */}
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
        {/* 触发器图标大小设置 */}
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
        {/* 高亮样式设置 */}
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
        {/* 自动发音设置 */}
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
        {/* 界面语言设置 */}
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
        {/* 翻译源语言设置 */}
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
        {/* 目标语言（母语）设置 */}
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
