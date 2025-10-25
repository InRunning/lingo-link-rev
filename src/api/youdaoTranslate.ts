/**
 * 有道翻译API封装
 *
 * 功能概述：
 * - 通过访问有道翻译网页版进行翻译
 * - 支持有道官方网页版的语言对
 * - 解析HTML页面提取翻译结果
 *
 * 技术细节：
 * - 使用background fetch获取网页内容
 * - DOM解析提取翻译文本
 * - 支持中文、英文、日文、韩文、法文
 * - 处理网页版翻译的跨域问题
 */
import { formateText, sendBackgroundFetch } from "@/utils";
import type { Language } from "@/types";

/**
 * 有道翻译支持的语言列表
 * 目前支持5种主流语言
 */
const youdaoSupportLang = ['zh', 'en', 'ja', 'ko', 'fr'];

/**
 * 有道翻译主函数
 * @param text 要翻译的文本
 * @param source 源语言代码
 * @param target 目标语言代码
 * @returns 翻译结果文本
 */
export default async function youdaoTranslate({
  text,
  source,
  target,
}: {
  text: string;
  source: string;
  target: string;
}) {
  try {
    // 确定实际使用的源语言（中文需要特殊处理）
    let fetchSource = source;
    if (fetchSource === 'zh') {
      // 如果源语言是中文，则使用目标语言进行查询
      fetchSource = target;
    }

    // 检查语言支持
    if (!youdaoSupportLang.includes(fetchSource)) {
      throw new Error(`有道翻译不支持 ${fetchSource} 作为学习语言`);
    }

    // 构建有道网页版翻译URL
    const url = `https://www.youdao.com/result?word=${formateText(
      text
    )}&lang=${fetchSource}`;

    // 通过background script获取网页HTML内容
    const data = await sendBackgroundFetch({
      url,
      responseType: "text",
    });

    // 解析HTML提取翻译结果
    return parseYouDaoTranslateHTML(data);
  } catch (error) {
    console.error('有道翻译错误:', error);
    if (error instanceof Error) {
      throw error.message;
    } else {
      throw '有道翻译请求失败';
    }
  }
}

/**
 * 解析有道翻译网页HTML内容
 * @param html 有道翻译网页的HTML源码
 * @returns 提取的翻译结果文本
 */
export function parseYouDaoTranslateHTML(html: string): string {
  // 创建DOM解析器
  const parser = new DOMParser();
  // 将HTML字符串解析为DOM文档
  const doc = parser.parseFromString(html, "text/html");
  
  // 查找翻译结果容器元素
  // 有道网页使用 .trans-content 或 .trans 作为结果容器
  let resultContainer: HTMLElement | null = null;
  resultContainer = doc.querySelector(".trans-content") || doc.querySelector(".trans");

  // 返回容器内的文本内容，如果没有找到则返回错误信息
  return resultContainer?.textContent ?? "无翻译内容";
}

/**
 * 有道翻译支持的语言列表
 *
 * 定义了有道翻译支持的5种语言及其显示名称
 * 用于在设置界面中显示可选语言选项
 */
export const languages: Language[] = [
  {
    language: "zh",
    name: "Chinese",
  },
  {
    language: "fr",
    name: "French",
  },
  {
    language: "en",
    name: "English",
  },
  {
    language: "ko",
    name: "Korean",
  },
  {
    language: "ja",
    name: "Japanese",
  },
];
