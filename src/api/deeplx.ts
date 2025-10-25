/**
 * DeepLX翻译API封装
 *
 * 功能概述：
 * - 使用用户自建的DeepLX服务进行文本翻译
 * - 适用于句子翻译，支持自定义服务器地址
 * - 通过background script避免跨域问题
 *
 * 技术细节：
 * - 使用用户配置的DeepLX服务器地址
 * - 默认从英文翻译到中文
 * - 支持自定义源语言和目标语言
 * - 通过background fetch发起请求
 */
import { toastManager } from "@/components/Toast";
import { getSetting } from "@/storage/sync";
import { sendBackgroundFetch } from "@/utils";

/**
 * DeepLX翻译结果类型
 */
type DeepLXTranslateResult = { data: string };

/**
 * DeepLX翻译函数
 * @param text 要翻译的文本
 * @returns 翻译结果文本
 */
export default async function deepLXTranslate({ text }: { text: string }) {
  try {
    // 获取用户设置
    const setting = await getSetting();

    // 检查DeepLX服务器地址配置
    if (!setting.deepLXAddress) {
      toastManager.add({
        type: 'error',
        msg: 'DeepLX服务器地址为空，请检查设置'
      });
      return;
    }

    // 发起DeepLX API请求
    const data: DeepLXTranslateResult | { error: string } = await sendBackgroundFetch({
      url: setting.deepLXAddress,
      method: 'POST',
      body: JSON.stringify({
        text,                // 要翻译的文本
        source_lang: 'en',   // 源语言（默认英文）
        target_lang: 'zh'    // 目标语言（默认中文）
      }),
      responseType: 'json'
    });

    // 处理API返回的错误
    if ('error' in data) {
      throw data.error;
    }

    // 返回翻译结果
    return data.data;
  } catch (error) {
    console.error('DeepLX翻译错误:', error);
    if (error instanceof Error) {
      throw error.message;
    } else {
      throw 'DeepLX翻译请求失败';
    }
  }
}
