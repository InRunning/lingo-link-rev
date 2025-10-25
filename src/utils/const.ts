/**
 * 常量配置文件
 * - 包含应用的所有默认配置、引擎设置、语言支持等常量
 * - 导出UI尺寸常量、语言列表、引擎配置等全局常量
 * - 提供完整的语言支持和引擎管理配置
 */
import { Language } from "@/types";
//import { codeBlock, oneLineTrim } from "common-tags";

/**
 * 中文语言代码格式化函数
 * - 将各种中文语言代码统一为标准格式
 * - 特殊处理简体中文代码，确保与浏览器语言设置兼容
 * @param str - 原始语言代码
 * @returns 格式化后的语言代码
 */
const formatZhCode = (str: string) => {
  if (/zh/.test(str) && str !== "zh-Hans" && str !== "zh-Hant") {
    return "zh-Hans";  // 默认使用简体中文
  } else {
    return str;
  }
};

//const isDev = import.meta.env.DEV;  // 开发环境标志（已注释）

// ===================== UI尺寸常量 =====================

/** 默认卡片宽度 */
export const defaultCardWidth = 500;

/** 默认卡片最小高度 */
export const defaultCardMinHeight = 150;

/** 翻译结果最大宽度 */
export const defaultTranslateMaxWidth = 500;

/** 翻译结果默认宽度 */
export const defaultTranslateWidth = 500;

/** 翻译结果最小高度 */
export const defaultTranslateMinHeight = 100;

// ===================== 单词管理相关常量 =====================

/** 单词列表网站URL */
export const wordListUrl = "https://words.mywords.cc";
  //export const wordListUrl = "https://words.mywords.cc/";  // 备用地址（已注释）

/** 检查当前页面是否为单词列表页面 */
export const isWordListPage = location.href === wordListUrl;

/** 单词列表窗口名称 */
export const wordListWindowName = "wordList";

// ===================== 支持语言常量 =====================

/** 支持的主要语言列表（用于简化显示） */
export const supportLanguages: Language[] = [
  {
    language: "en",
    name: "English",
  },
  {
    language: "zh",
    name: "Chinese",
  },
  {
    language: "ja",
    name: "Japanese",
  },
  {
    language: "ko",
    name: "Korean",
  },
  {
    language: "fr",
    name: "French",
  },
];

// ===================== 默认设置配置 =====================

/**
 * 应用默认设置
 * - 包含所有可配置项的默认值
 * - 包括API配置、UI设置、翻译引擎配置等
 */
export const defaultSetting = {
  // OpenAI API配置
  openAIKey: "",
  openAIAddress: "https://api.openai.com/v1/chat/completions",
  openAIModel: "gpt-4o",
  
  // 默认翻译引擎
  engine: "google",
  
  // 语言设置
  targetLanguage: formatZhCode(navigator.language),  // 目标语言，根据浏览器语言自动设置
  sourceLanguage: {
    language: "en",
    name: "English",
  },
  
  // UI设置
  showSelectionIcon: true,                    // 显示选择图标
  interfaceLanguage: navigator.language === "en" ? "en" : "zh",  // 界面语言
  autoPronounce: false,                       // 自动发音
  triggerIconSize: 25,                       // 触发图标大小
  highlightColor: "black",                   // 高亮颜色
  highlightStyle: "dashed" as HighlightName, // 高亮样式
  autoSaveWord: false,                       // 自动保存单词
  
  // 已注释的引擎配置（早期版本）
  // availableEngines: [
  //   {
  //     name: "Youdao",
  //     value: "youdao",
  //   },
  //   {
  //     name: "Google",
  //     value: "google",
  //   },
  // ] as EngineItem[],
  
  // 单词学习AI提示模板（已注释的复杂版本）
  // wordSystemPrompt: codeBlock`
  //   ${oneLineTrim`
  //   你是一个翻译引擎，翻译的目标语言为{targetLanguage}，只需要翻译不需要解释。
  //   当给出一个单词时，
  //   请给出单词原始形态（如果有）、
  //   单词的语种、
  //   对应的音标或转写、
  //   所有含义（含词性）、
  //   双语示例，三条例句。
  //   请严格按照下面格式给到翻译结果：`}
  //       <单词>
  //       [<语种>]· / <Pinyin> /
  //       [<词性缩写>] <中文含义>]（如果同时给出了句子，解释单词在句子中的含义）
  //       [<句子的含义>]（如果同时给出了句子）
  //       例句：
  //       <序号><例句>(例句翻译)
  //       词源：
  //       <词源>
  // `,
  
  // 当前使用的单词学习AI提示（简化版本）
  wordSystemPrompt:'我正在学习英语，接下来我会提供给你一个句子和这个句子中的一个单词，请以牛津英汉词典的格式解释句子中的这个单词的含义，并举出一个英文例句，同时把英文例句翻译成中文',
  //wordUserContent: `单词是：{word}`,  // 早期版本（已注释）
  
  // 当前使用的单词用户内容提示
  wordUserContent:'单词是：{word}，句子是{sentence}',
  
  // 句子翻译AI提示
  sentenceSystemPrompt: `You are a translation AI. You only need to provide the translation result without adding any irrelevant content.`,
  sentenceUserContent: `Translate the following text to {targetLanguage}:{sentence}`,
  
  // 外部链接配置
  externalLinks: [
    {
      id: "1",
      name: "百度翻译",
      link: "https://fanyi.baidu.com/#en/zh/{text}",
    },
    {
      id: "2",
      name: "朗文",
      link: "https://www.ldoceonline.com/dictionary/{text}",
    },
    {
      id: "3",
      name: "柯林斯",
      link: "https://www.collinsdictionary.com/zh/dictionary/english/{text}",
    },
  ],
  
  // 引擎配置列表
  engineList: [
    // 传统翻译引擎
    {
      name: "Youdao",
      value: "youdao",
      isChat: false,      // 非聊天引擎
      checked:true,       // 默认启用
      compatible: 'both', // 支持单词和句子
    },
    {
      name: "Collins",
      value: "collins",
      isChat: false,
      checked:true,
      compatible: 'word', // 仅支持单词
    },
    {
      name: "Google",
      value: "google",
      isChat: false,
      checked:true,
      compatible: 'sentence', // 仅支持句子
    },
    
    // AI聊天引擎
    {
      name: "OpenAI",
      value: "openai",
      isChat: true,
      checked:false,
      compatible: 'both',
    },
    {
      name: "Gemini",
      value: "gemini",
      isChat: true,
      checked:false,
      compatible: 'both',
    },
    {
      name: "文心一言",
      value: "wenxin",
      isChat: true,
      checked:false,
      compatible: 'both',
    },
    {
      name: "DeepSeek",
      value: "deepseek",
      isChat: true,
      checked:false,
      compatible: 'both',
    },
    {
      name: "moonshot",
      value: "moonshot",
      isChat: true,
      checked:false,
      compatible: 'both',
    },
    {
      name: "DeepLX",
      value: "deeplx",
      isChat: false,
      checked:false,
      compatible: 'sentence',
    },
    {
      name: "Custom",
      value: "custom",
      isChat: true,
      checked:false,
      compatible: 'both',
    }
  ]
};

/** 过滤后的单词引擎列表（排除仅支持句子的引擎） */
export const allWordEngineList = defaultSetting.engineList.filter(item => item.compatible !== 'sentence');

/** 过滤后的句子引擎列表（排除仅支持单词的引擎） */
export const allSentenceEngineList = defaultSetting.engineList.filter(item => item.compatible !== 'word');

// ===================== 完整语言支持列表 =====================

/** 源语言选择列表（翻译的源语言） */
export const SourceLanguage: Language[] = [
  // 常用语言
  { name: "English", nameEn: "English", language: "en" },
  { name: "简体中文", nameEn: "Simplified Chinese", language: "zh" },
  { name: "日本語", nameEn: "Japanese", language: "ja" },
  { name: "한국어", nameEn: "Korean", language: "ko" },
  { name: "한국어 반말", nameEn: "Korean", language: "ko-banmal" },
  { name: "Français", nameEn: "French", language: "fr" },
  
  // 欧洲语言
  { name: "Deutsch", nameEn: "German", language: "de" },
  { name: "Español", nameEn: "Spanish", language: "es" },
  { name: "Italiano", nameEn: "Italian", language: "it" },
  { name: "Русский", nameEn: "Russian", language: "ru" },
  { name: "Português", nameEn: "Portuguese", language: "pt" },
  { name: "Nederlands", nameEn: "Dutch", language: "nl" },
  { name: "Polski", nameEn: "Polish", language: "pl" },
  
  // 其他语言
  { name: "العربية", nameEn: "Arabic", language: "ar" },
  { name: "Afrikaans", nameEn: "Afrikaans", language: "af" },
  { name: "አማርኛ", nameEn: "Amharic", language: "am" },
  { name: "Azərbaycan", nameEn: "Azerbaijani", language: "az" },
  { name: "Беларуская", nameEn: "Belarusian", language: "be" },
  { name: "Български", nameEn: "Bulgarian", language: "bg" },
  { name: "বাংলা", nameEn: "Bengali", language: "bn" },
  { name: "Bosanski", nameEn: "Bosnian", language: "bs" },
  { name: "Català", nameEn: "Catalan", language: "ca" },
  { name: "Cebuano", nameEn: "Cebuano", language: "ceb" },
  { name: "Corsu", nameEn: "Corsican", language: "co" },
  { name: "Čeština", nameEn: "Czech", language: "cs" },
  { name: "Cymraeg", nameEn: "Welsh", language: "cy" },
  { name: "Dansk", nameEn: "Danish", language: "da" },
  { name: "Ελληνικά", nameEn: "Greek", language: "el" },
  { name: "Esperanto", nameEn: "Esperanto", language: "eo" },
  { name: "Eesti", nameEn: "Estonian", language: "et" },
  { name: "Euskara", nameEn: "Basque", language: "eu" },
  { name: "فارسی", nameEn: "Persian", language: "fa" },
  { name: "Suomi", nameEn: "Finnish", language: "fi" },
  { name: "Fijian", nameEn: "Fijian", language: "fj" },
  { name: "Frysk", nameEn: "Frisian", language: "fy" },
  { name: "Gaeilge", nameEn: "Irish", language: "ga" },
  { name: "Gàidhlig", nameEn: "Scottish Gaelic", language: "gd" },
  { name: "Galego", nameEn: "Galician", language: "gl" },
  { name: "ગુજરાતી", nameEn: "Gujarati", language: "gu" },
  { name: "Hausa", nameEn: "Hausa", language: "ha" },
  { name: "Hawaiʻi", nameEn: "Hawaiian", language: "haw" },
  { name: "עברית", nameEn: "Hebrew", language: "he" },
  { name: "हिन्दी", nameEn: "Hindi", language: "hi" },
  { name: "Hmong", nameEn: "Hmong", language: "hmn" },
  { name: "Hrvatski", nameEn: "Croatian", language: "hr" },
  { name: "Kreyòl Ayisyen", nameEn: "Haitian Creole", language: "ht" },
  { name: "Magyar", nameEn: "Hungarian", language: "hu" },
  { name: "Հայերեն", nameEn: "Armenian", language: "hy" },
  { name: "Bahasa Indonesia", nameEn: "Indonesian", language: "id" },
  { name: "Igbo", nameEn: "Igbo", language: "ig" },
  { name: "Íslenska", nameEn: "Icelandic", language: "is" },
  { name: "Jawa", nameEn: "Javanese", language: "jw" },
  { name: "ქართული", nameEn: "Georgian", language: "ka" },
  { name: "Қазақ", nameEn: "Kazakh", language: "kk" },
  { name: "Монгол хэл", nameEn: "Mongolian", language: "mn" },
  { name: "Türkçe", nameEn: "Turkish", language: "tr" },
  { name: "ئۇيغۇر تىلى", nameEn: "Uyghur", language: "ug" },
  { name: "Українська", nameEn: "Ukrainian", language: "uk" },
  { name: "اردو", nameEn: "Urdu", language: "ur" },
  { name: "Tiếng Việt", nameEn: "Vietnamese", language: "vi" },
  { name: "Svenska", nameEn: "Swedish", language: "sv" },
  { name: "ไทย", nameEn: "Thai", language: "th" },
] as const;

/** 完整语言选择列表（包括目标语言选择） */
export const AllLanguage: Language[] = [
  // 选择提示
  { name: "--Please Select--", language: "" },
  
  // 英语变体
  { name: "English", nameEn: "English", language: "en" },
  { name: "American English", nameEn: "English (US)", language: "en-US" },
  { name: "British English", nameEn: "English (UK)", language: "en-GB" },
  { name: "Canadian English", nameEn: "English (Canada)", language: "en-CA" },
  {
    name: "Australian English",
    nameEn: "English (Australia)",
    language: "en-AU",
  },
  
  // 中文变体
  { name: "简体中文", nameEn: "Simplified Chinese", language: "zh-Hans" },
  { name: "繁體中文", nameEn: "Traditional Chinese", language: "zh-Hant" },
  { name: "粤语", nameEn: "Cantonese", language: "yue" },
  { name: "古文", nameEn: "Classical Chinese", language: "lzh" },
  { name: "近代白话文", nameEn: "Modern Standard Chinese", language: "jdbhw" },
  { name: "现代白话文", nameEn: "Contemporary Chinese", language: "xdbhw" },
  
  // 其他语言（包含所有在SourceLanguage中定义的语言）
  { name: "日本語", nameEn: "Japanese", language: "ja" },
  { name: "한국어", nameEn: "Korean", language: "ko" },
  { name: "한국어 반말", nameEn: "Korean", language: "ko-banmal" },
  { name: "Français", nameEn: "French", language: "fr" },
  { name: "Deutsch", nameEn: "German", language: "de" },
  { name: "Español", nameEn: "Spanish", language: "es" },
  { name: "Italiano", nameEn: "Italian", language: "it" },
  { name: "Русский", nameEn: "Russian", language: "ru" },
  { name: "Português", nameEn: "Portuguese", language: "pt" },
  { name: "Nederlands", nameEn: "Dutch", language: "nl" },
  { name: "Polski", nameEn: "Polish", language: "pl" },
  { name: "العربية", nameEn: "Arabic", language: "ar" },
  { name: "Afrikaans", nameEn: "Afrikaans", language: "af" },
  { name: "አማርኛ", nameEn: "Amharic", language: "am" },
  { name: "Azərbaycan", nameEn: "Azerbaijani", language: "az" },
  { name: "Беларуская", nameEn: "Belarusian", language: "be" },
  { name: "Български", nameEn: "Bulgarian", language: "bg" },
  { name: "বাংলা", nameEn: "Bengali", language: "bn" },
  { name: "Bosanski", nameEn: "Bosnian", language: "bs" },
  { name: "Català", nameEn: "Catalan", language: "ca" },
  { name: "Cebuano", nameEn: "Cebuano", language: "ceb" },
  { name: "Corsu", nameEn: "Corsican", language: "co" },
  { name: "Čeština", nameEn: "Czech", language: "cs" },
  { name: "Cymraeg", nameEn: "Welsh", language: "cy" },
  { name: "Dansk", nameEn: "Danish", language: "da" },
  { name: "Ελληνικά", nameEn: "Greek", language: "el" },
  { name: "Esperanto", nameEn: "Esperanto", language: "eo" },
  { name: "Eesti", nameEn: "Estonian", language: "et" },
  { name: "Euskara", nameEn: "Basque", language: "eu" },
  { name: "فارسی", nameEn: "Persian", language: "fa" },
  { name: "Suomi", nameEn: "Finnish", language: "fi" },
  { name: "Fijian", nameEn: "Fijian", language: "fj" },
  { name: "Frysk", nameEn: "Frisian", language: "fy" },
  { name: "Gaeilge", nameEn: "Irish", language: "ga" },
  { name: "Gàidhlig", nameEn: "Scottish Gaelic", language: "gd" },
  { name: "Galego", nameEn: "Galician", language: "gl" },
  { name: "ગુજરાતી", nameEn: "Gujarati", language: "gu" },
  { name: "Hausa", nameEn: "Hausa", language: "ha" },
  { name: "Hawaiʻi", nameEn: "Hawaiian", language: "haw" },
  { name: "עברית", nameEn: "Hebrew", language: "he" },
  { name: "हिन्दी", nameEn: "Hindi", language: "hi" },
  { name: "Hmong", nameEn: "Hmong", language: "hmn" },
  { name: "Hrvatski", nameEn: "Croatian", language: "hr" },
  { name: "Kreyòl Ayisyen", nameEn: "Haitian Creole", language: "ht" },
  { name: "Magyar", nameEn: "Hungarian", language: "hu" },
  { name: "Հայերեն", nameEn: "Armenian", language: "hy" },
  { name: "Bahasa Indonesia", nameEn: "Indonesian", language: "id" },
  { name: "Igbo", nameEn: "Igbo", language: "ig" },
  { name: "Íslenska", nameEn: "Icelandic", language: "is" },
  { name: "Jawa", nameEn: "Javanese", language: "jw" },
  { name: "ქართული", nameEn: "Georgian", language: "ka" },
  { name: "Қазақ", nameEn: "Kazakh", language: "kk" },
  { name: "Монгол хэл", nameEn: "Mongolian", language: "mn" },
  { name: "Türkçe", nameEn: "Turkish", language: "tr" },
  { name: "ئۇيغۇر تىلى", nameEn: "Uyghur", language: "ug" },
  { name: "Українська", nameEn: "Ukrainian", language: "uk" },
  { name: "اردو", nameEn: "Urdu", language: "ur" },
  { name: "Tiếng Việt", nameEn: "Vietnamese", language: "vi" },
  { name: "Svenska", nameEn: "Swedish", language: "sv" },
  { name: "ไทย", nameEn: "Thai", language: "th" },
] as const;

/** 语言代码类型定义 */
export type LangCode = (typeof AllLanguage)[number]["language"];

// ===================== 扩展配置常量 =====================

/** 浏览器扩展ID */
export const extensionId = "ahhlnchdiglcghegemaclpikmdclonmo";

// ===================== 引擎图标配置 =====================

/** 引擎图标URL映射 */
export const enginePicArr = {
  youdao:
    "https://qph.cf2.poecdn.net/main-thumb-pb-1091482-200-ufgqhqgohdggdfzitfacamfxuamtfbye.jpeg",
  google:
    "https://qph.cf2.poecdn.net/main-thumb-pb-3655359-200-eomiajapmpmpgnwktjnxhcfbdlueukgq.jpeg",
  openai:
    "https://qph.cf2.poecdn.net/main-thumb-pb-3004-200-jougqzjtwfqfyqprxbdwofvnwattmtrg.jpeg",
  gemini:
    "https://qph.cf2.poecdn.net/main-thumb-pb-3669463-200-hqyxuiygtmnetolnimubmwhakbsueapd.jpeg",
  wenxin:
    "https://qph.cf2.poecdn.net/main-thumb-pb-3669463-200-hqyxuiygtmnetolnimubmwhakbsueapd.jpeg",
  moonshot:
    "https://qph.cf2.poecdn.net/main-thumb-pb-1160656-200-rzstcnvivfmlwjkijfkbhhpclcrjhopa.jpeg",
};

// ===================== 高亮样式配置 =====================

/** 可用的高亮样式列表 */
export const highlightStyles = [
  'none',             // 无高亮
  'background',       // 背景高亮
  'text',            // 文字高亮
  'underline',       // 下划线
  'double-underline', // 双下划线
  'wavy',           // 波浪线
  'dotted',         // 点线
  'dashed'          // 虚线
] as const

/** 高亮样式名称类型 */
export type HighlightName = (typeof highlightStyles)[number]
