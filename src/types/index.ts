/**
 * 全局类型定义模块
 *
 * 功能概述：
 * - 集中管理浏览器扩展的所有TypeScript类型定义
 * - 包括消息通信、用户设置、语言配置、引擎枚举等核心数据类型
 * - 确保类型安全，提供完整的IDE智能提示支持
 *
 * 主要包含：
 * 1. 消息通信类型：ExtensionMessage, ExternalMessage
 * 2. 用户数据类型：User, ExternalLink
 * 3. 设置配置类型：Setting, Local
 * 4. 语言相关类型：Language, InterfaceLanguage
 * 5. 引擎相关类型：EngineItem, EngineValue
 * 6. 社区功能类型：CommunityItemType, CollectRemarkInfo
 */
import { HighlightName, LangCode, defaultSetting } from "@/utils/const";
import type { CommunityItemType, Sww } from "./words";

/**
 * 后台请求参数接口
 *
 * 用于定义background script发起HTTP请求时的参数结构
 * 支持GET/POST请求，可指定响应数据类型（文本/JSON/DataURL）
 */
export interface BackgroundFetchParam {
  url: string;                          // 请求URL地址
  method?: "GET" | "POST";             // HTTP请求方法，默认GET
  responseType: "text" | "json" | "dataURL";  // 响应数据类型
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers?: Record<string, any>;        // 自定义请求头
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;                          // POST请求体数据
}
/**
 * 扩展消息类型联合
 *
 * 定义content script、background script和options页面之间的通信消息类型
 * 使用TypeScript联合类型确保消息格式的准确性和完整性
 */
export type ExtensionMessage =
  | {
      type: "fetch";                    // 发起HTTP请求消息
      payload: BackgroundFetchParam;    // 请求参数
    }
  | {
      type: "auth";                     // 认证相关消息
    }
  | {
      type: "openOptions";             // 打开扩展设置页面
    }
  | {
      type: "captureScreen";           // 截屏功能
    }
  | {
      type: "showCardAndPosition";     // 显示翻译卡片和位置信息
    }
  | {
      type: "onScreenDataurl";         // 截屏数据URL
      payload: string;                 // base64编码的图片数据
    }
  | {
      type: "getCurWindowSelectionInfo" // 获取当前窗口选中信息
    }
  | {
      type: 'refreshLocalData'         // 刷新本地数据
  };
/**
 * 外部消息类型
 *
 * 用于content script与外部页面或组件之间的消息传递
 */
export type ExternalMessage = {
  type: 'getUser'                     // 获取用户信息请求
};

/**
 * 用户信息接口
 *
 * 存储用户的基本信息、认证令牌和相关状态
 */
export interface User {
  picture?: string;                    // 用户头像URL
  name?: string;                       // 用户显示名称
  email: string;                       // 用户邮箱（必填）
  id: string;                          // 用户唯一标识符
  token: string;                       // 认证令牌
  emailCode?: number;                  // 邮箱验证码
  emailTime?: number;                  // 验证码发送时间戳
}

/**
 * 外部链接接口
 *
 * 定义用户自定义的外部查询链接，用于跳转到第三方翻译网站
 */
export interface ExternalLink {
  id: string;                          // 链接唯一标识
  name: string;                        // 链接显示名称
  link: string;                        // 链接URL地址
}
/**
 * 界面语言类型
 *
 * 定义扩展界面支持的语言类型
 */
export type InterfaceLanguage = "en" | "zh";

/**
 * Oulu学习平台信息接口
 *
 * 存储与Oulu语言学习平台相关的用户信息和配置
 */
export type OuluInfo = {
  token?: string;                        // Oulu平台访问令牌
  bookList?: { name: string; id: string; lang: string }[];  // 用户书籍列表
  targetBookId?: string;                 // 目标学习书籍ID
  targetBookLang?: string;               // 目标书籍语言
  open?: boolean;                        // 是否启用Oulu功能
};

/**
 * 扩展设置接口
 *
 * 定义扩展的所有配置选项，包括翻译引擎、用户偏好、语言设置等
 */
export interface Setting {
  userInfo?: User | null;               // 用户认证信息
  openAIKey?: string;                   // OpenAI API密钥
  openAIAddress?: string;               // OpenAI API地址
  openAIModel?: string;                 // OpenAI模型名称
  showSelectionIcon?: boolean;          // 是否显示选中图标
  engine?: EngineValue;                 // 默认翻译引擎
  geminiKey?: string;                   // Google Gemini API密钥
  moonShotKey?: string;                 // 月之暗面API密钥
  targetLanguage?: LangCode;            // 目标翻译语言
  sourceLanguage?: Language;            // 源语言设置
  interfaceLanguage?: InterfaceLanguage; // 界面语言
  autoPronounce?: boolean;              // 是否自动朗读
  triggerIcon?: string;                 // 触发图标
  triggerIconSize?: number;             // 触发图标大小
  highlightColor?: string;              // 高亮颜色
  highlightStyle?: HighlightName;       // 高亮样式
  wenxinToken?: string;                 // 百度文心一言Token
  availableEngines?: EngineItem[];      // 可用引擎列表（已废弃）
  wordEngineList?: EngineItem[];        // 单词翻译引擎列表
  sentenceEngineList?: EngineItem[];    // 句子翻译引擎列表
  wordSystemPrompt?: string;            // 单词翻译系统提示词
  wordUserContent?: string;             // 单词翻译用户内容模板
  sentenceSystemPrompt?: string;        // 句子翻译系统提示词
  sentenceUserContent?: string;         // 句子翻译用户内容模板
  externalLinks?: ExternalLink[];       // 外部查询链接列表
  ouluInfo?: OuluInfo;                  // Oulu平台信息
  screenshotToken?: string;             // 截屏功能令牌
  deepSeekApiKey?: string;              // DeepSeek API密钥
  deepLXAddress?: string;               // DeepLX翻译服务地址
  customAIAddress?: string;             // 自定义AI服务地址
  customAIModel?: string;               // 自定义AI模型
  customAIKey?: string;                 // 自定义AI API密钥
  autoSaveWord?: boolean;               // 是否自动保存单词
  shoutcut?: string;                    // 快捷键设置
}
/**
 * 本地数据接口
 *
 * 定义存储在浏览器本地存储中的数据结构
 */
export interface Local {
  swwList?: Sww[];                      // 单词短语列表
  remarkList?: CommunityItemType[];     // 用户备注列表
  openAIModelList?: { label: string; value: string }[];  // OpenAI模型列表
}

/**
 * Google用户信息接口
 *
 * 通过Google登录获取的用户基本信息
 */
export interface GoogleUser {
  email: string;                        // Google账户邮箱
  name: string;                         // Google账户显示名称
  picture: string;                      // Google账户头像URL
}

/**
 * Google登录错误接口
 *
 * 定义Google OAuth登录过程中的错误响应格式
 */
export interface GoogleLoginError {
  error: string;                        // 错误代码
  error_description: string;            // 错误描述信息
}

/**
 * 语言信息接口
 *
 * 定义语言的基本信息，包括语言代码和显示名称
 */
export interface Language {
  language: string;                     // 语言代码（如en, zh, ja等）
  name: string;                         // 语言本地化显示名称
  nameEn?: string;                      // 英文显示名称（可选）
}

/**
 * 引擎类型相关类型别名
 *
 * 基于defaultSetting.engineList定义的类型推断，用于确保类型安全
 */
export type AllEnginesArray = typeof defaultSetting.engineList;
export type EngineItem = AllEnginesArray[number];        // 引擎项类型
export type EngineValue = (typeof defaultSetting.engineList)[number]["value"];  // 引擎值类型

/**
 * 页面内消息类型联合
 *
 * 定义页面内组件间的消息传递格式，用于React组件间的状态同步
 */
export type PostMessage =
  | {
      name: "swwListUpdate";              // 更新单词列表消息
      payload: Sww[];                     // 新的单词列表数据
    }
  | {
      name: "userInfoUpdate";             // 更新用户信息消息
      payload: User | undefined | null;   // 用户信息数据
    }
  | {
      name: "showCard";                   // 显示翻译卡片消息
      payload: {
        mode: "practice" | "normal";      // 卡片模式：练习/正常
        text: string;                     // 要翻译的文本
        context?: string;                 // 上下文信息
        position?: {                      // 卡片位置
          x: number;
          y: number;
        };
        domRect?: DOMRect;                // DOM元素矩形信息
      };
    }
  | {
      name: "hidePracticeCard";           // 隐藏练习卡片
    }
  | {
      name: "practiceWordNext";           // 练习下一个单词
    }
  | {
      name: "iframeOnload";               // iframe加载完成
    }
  | {
      name: "fillCollectForm";            // 填充收集表单
      payload: Partial<Pick<Sww, "id" | "context" | "word" | "remark">>;  // 表单数据
    };

/**
 * Collins词典单词类型
 *
 * 定义从Collins词典API获取的单词数据结构
 */
export type CollinsWord = {
  phonetic: string | null | undefined;    // 音标
  explains: {                             // 释义列表
    pos: string | null | undefined;       // 词性
    def: string | undefined | null;       // 词义定义
    examples: (string | undefined | null)[];  // 例句列表
  }[];
};

/**
 * 收集基本信息接口
 *
 * 定义用户收集单词时的基本信息
 */
export interface CollectBasicInfo {
  word: string;                           // 单词
  context: string;                        // 上下文
}

/**
 * 收集备注信息类型
 *
 * 社区功能的备注信息类型，与CommunityItemType相同
 */
export type CollectRemarkInfo = CommunityItemType;
