/**
 * Google 翻译API封装
 *
 * 功能概述：
 * - 使用Google免费翻译接口进行文本翻译
 * - 通过background script避免跨域问题
 * - 自动解析Google翻译API返回的嵌套数组格式
 *
 * 技术细节：
 * - 调用 translate.googleapis.com 免费接口
 * - 支持自动检测源语言 (sl=auto)
 * - 解析二维数组格式的返回结果为纯文本
 * - 处理CORS限制通过background fetch
 */
import { sendBackgroundFetch } from "@/utils";

/**
 * Google翻译API返回结果类型
 * Google返回的是嵌套数组结构，需要进一步解析
 */
type GoogleTranslateResult = (string | unknown)[];

/**
 * Google翻译函数
 * @param text 要翻译的文本
 * @param targetLang 目标语言代码
 * @returns 翻译结果文本
 */
export default async function googleTranslate({
  text,
  targetLang
}: {
  text: string;
  targetLang: string;
}) {
  try {
    // 构建Google翻译API请求URL
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    // 通过background script发起请求获取JSON数据
    const data: GoogleTranslateResult | { error: string } = await sendBackgroundFetch({
      url,
      responseType: 'json'
    });

    // 处理API返回的错误
    if ('error' in data) {
      throw data.error;
    }

    // 解析Google返回的嵌套数组格式
    let result = '';
    for (const item0 of data) {
      if (item0 instanceof Array) {
        // 遍历第二层数组
        for (const item1 of item0) {
          if (item1 instanceof Array) {
            // 第三层数组的第一个元素是翻译文本
            result += item1[0];
          }
        }
      }
      // null表示翻译完成
      if (item0 === null) {
        return result;
      }
    }

    return result;
  } catch (error) {
    console.error('Google翻译错误:', error);
    if (error instanceof Error) {
      throw error.message;
    } else {
      throw 'Google翻译请求失败';
    }
  }
}
