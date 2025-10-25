/**
 * Hook：有道词典老版本数据获取（Collins词典）
 * - 专门处理有道词典老版本的Collins词典数据
 * - 支持解析柯林斯高阶英汉双解学习词典的HTML内容
 * - 仅支持英语(lang === 'en')的词汇查询
 * - 包含详细的词汇信息：分类、音标、星级、例句等
 */
import { useEffect, useRef,useState } from "react";
import { sendBackgroundFetch } from "@/utils";
import type { YoudaoCollins } from "@/types/words";

/**
 * 解析Collins词典HTML内容的函数
 * @param html - 从有道词典API返回的HTML字符串
 * @returns Array<YoudaoCollins> - 解析后的Collins词典数据结构数组
 */
function parseCollinsHTML(html:string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  // 获取所有翻译容器（Collins结果区域）
  const transContainers = doc.querySelectorAll('#collinsResult .wt-container')
  
  // 遍历每个翻译容器，提取详细信息
  const result = Array.from(transContainers).map((transContainer) => {
    // 获取词汇分类（如n.名词、v.动词等）
    const category = transContainer
      .querySelector('.title.trans-tip span')
      ?.textContent?.trim()
      .toLowerCase()
      
    // 获取音标信息
    const phonetic = transContainer.querySelector('.phonetic')?.textContent?.trim()
    
    // 提取星级评分（0-5星）
    let star = 0
    const $star = transContainer.querySelector('.star')
    if ($star) {
      const starMatch = /star(\d+)/.exec(String($star.className))
      if (starMatch) {
        star = Number(starMatch[1])
      }
    }
    
    // 获取词汇使用频率排名
    const rank = (transContainer.querySelector('.via.rank') as HTMLElement)?.innerText?.trim()
    
    // 获取词汇搭配模式
    const pattern = transContainer.querySelector('.additional.pattern')?.textContent?.trim()
    
    // 在每个翻译容器中获取所有的单词解释和例句
    const explanations = Array.from(transContainer.querySelectorAll('.ol > li')).map((li) => {
      // 获取词性标记（已注释）
      
      // 获取词语解释，包含了英文和中文翻译
      const explanation = (li.querySelector('.collinsMajorTrans p') as HTMLElement)?.innerText
        .replace(/\t|\n/g, '')  // 移除制表符和换行符
        .trim()
        
      // 获取例句。注意这里可能有多个例句
      const examples = Array.from(li.querySelectorAll('.examples p')).map((p) =>
        p.textContent?.trim() ?? '',
      )
      
      return {
        explanation,  // 词汇解释
        examples,     // 例句数组
      }
    })
    
    // 过滤掉无效的解释条目
    const invalidIndex = explanations.findIndex((e) => !e.explanation)
    if (invalidIndex !== -1) {
      explanations.splice(invalidIndex, 1)
    }
    
    // 返回解析后的单个词汇条目结构
    return {
      category,      // 词汇分类
      phonetic,      // 音标
      star,          // 星级评分
      rank,          // 使用频率排名
      pattern,       // 搭配模式
      explanations,  // 解释和例句数组
    }
  })
  
  return result
}

/**
 * 获取词汇数据的异步函数（老版本API）
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
    // 使用有道词典老版本API
    const response = await sendBackgroundFetch({
      url:`https://dict.youdao.com/w/${text}`,
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
 * useOldYoudao Hook主函数
 * @param searchText - 搜索的文本内容
 * @param lang - 目标语言代码（仅支持'en'）
 * @returns Object - 包含loading状态和wordData的数据
 */
export default function useOldYoudao(searchText:string,lang:string){
  // 防抖定时器引用，避免频繁请求
  const timer = useRef<number | null>(null);
  
  // 加载状态管理
  const [loading, setLoading] = useState(false);
  
  // Collins词典数据结构
  const [wordData, setWordData] = useState<YoudaoCollins>([]);
  
  /**
   * 主要Effect：监听searchText和lang的变化，触发数据获取
   * 注意：此Hook仅支持英语(lang === 'en')查询
   */
  useEffect(() => {
    // 仅处理英语查询，其他语言直接返回
    if (lang !== 'en'){return}
    
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
      // 解析HTML响应为Collins词典结构化数据
      const data = parseCollinsHTML(res);
      setWordData(data)
    });
  }, [searchText,lang]);
  
  // 返回状态数据供组件使用
  return {loading,wordData}
}