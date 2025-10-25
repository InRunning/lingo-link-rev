/**
 * Hook：有道词典数据获取
 * - 封装有道词典网页版的数据获取和解析逻辑
 * - 支持异步请求、加载状态管理和错误处理
 * - 自动延迟500ms触发请求，避免频繁调用
 * - 解析HTML响应为结构化的词汇数据结构
 */
import { useEffect, useRef,useState } from "react";
import { sendBackgroundFetch } from "@/utils";
import { parseYouDaoHTML } from "@/utils/newYoudaoParser";
import type { WordData } from "@/types/words";
import { getSetting } from "@/storage/sync";
import { defaultSetting } from "@/utils/const";

/**
 * 获取词汇数据的异步函数
 * @param text - 待查询的词汇文本
 * @param beforeComplete - 请求开始前的回调函数
 * @param onComplete - 请求完成后的回调函数
 * @returns Promise<string | null> - 返回HTML响应内容或null
 */
const fetchWord = async ({
  text,
  beforeComplete,
  onComplete,
}: {
  text: string;
  beforeComplete: () => void;
  onComplete: () => void;
}) => {
  // 空文本检查
  if (!text) {
    return null;
  }
  
  // 通知开始加载
  beforeComplete();
  
  try {
    // 获取用户设置中的源语言配置
    const sourceLanguage = (await getSetting()).sourceLanguage?.language ?? defaultSetting.sourceLanguage.language;
    
    // 通过background script发送跨域请求获取有道词典数据
    const response = await sendBackgroundFetch({
      // 有道词典老版本API（已注释）
      //url: `https://dict.youdao.com/w/${text}`,
      
      // 有道词典新版本API
      url:`https://www.youdao.com/result?word=${text}&lang=${sourceLanguage}`,
      responseType: "text",
    });
    
    // 检查响应是否有效
    if (!response) {
      return null;
    }
    return response;
  } finally {
    // 确保在请求完成后调用完成回调
    onComplete();
  }
};

/**
 * useYoudao Hook主函数
 * @param searchText - 搜索的文本内容
 * @param lang - 目标语言代码
 * @returns Object - 包含loading状态和wordData的数据
 */
export default function useYoudao(searchText:string,lang:string){
  // 防抖定时器引用，避免频繁请求
  const timer = useRef<number | null>(null);
  
  // 加载状态管理
  const [loading, setLoading] = useState(false);
  
  // 词汇数据结构
  const [wordData, setWordData] = useState<WordData|null>(null);
  
  /**
   * 主要Effect：监听searchText和lang的变化，触发数据获取
   * 使用防抖机制避免频繁请求，提升用户体验
   */
  useEffect(() => {
    // let isIgnore = false; // 组件卸载标志（已注释）
    
    fetchWord({
      text: searchText,
      beforeComplete: () => {
        // 清除之前的定时器，设置新的防抖定时器
        timer.current && clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          setLoading(true);
        }, 500); // 500ms防抖延迟
        
      },
      onComplete() {
        // if (isIgnore){return} // 组件卸载检查（已注释）
        
        // 清除定时器，设置加载状态为false
        timer.current && clearTimeout(timer.current);
        setLoading(false);
      },
    }).then((res) => {
      // if (isIgnore){return} // 组件卸载检查（已注释）
      
      // 解析HTML响应为结构化数据
      const data = parseYouDaoHTML(res, lang);
      
      // 如果解析结果为空，可能需要语言检测（已注释的功能）
      if (data.explains.length === 0) {
        // baiduDetectLang(searchText).then(res => {
        //   //if (res)
        // })
      }
      
      // 更新词汇数据状态
      setWordData(data)
    });
    
    return () => {
      // isIgnore = true; // 组件卸载时设置忽略标志
      // timer.current && clearTimeout(timer.current); // 清理定时器
    }
  }, [searchText,lang]);
  
  // 返回状态数据供组件使用
  return {loading,wordData}
}