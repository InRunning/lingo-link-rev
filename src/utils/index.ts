/**
 * 工具方法集合
 * - DOM/窗口计算：位置防溢出、选区检测等
 * - 后台通信：backgroundFetch/sendBackgroundFetch
 * - 文本/消息处理：isWord、formateMessage、handleStream
 * - 图片处理：compressImg、base64ToBlob
 * - 其他：柯林斯词典 HTML 解析、popup 环境判断
 *
 * 本文件集中了扩展的所有通用工具函数
 * 提供跨域请求、网络通信、DOM操作、数据处理等核心功能
 */
import type {
  BackgroundFetchParam,
  EngineValue,
  ExtensionMessage,
} from "@/types/index";
import type { Sww } from "@/types/words";
import { Message } from "@/types/chat";
import { createParser } from "eventsource-parser";
import type { CollinsWord } from "@/types/index";

// ===================== 文本处理工具 =====================

/**
 * 格式化文本内容
 * 将文本中的换行符与多余空白字符压缩为单个空格
 * 用于清理用户输入或API返回的文本内容
 * @param str - 需要格式化的文本
 * @returns 格式化后的文本
 */
export const formateText = (str: string) => {
  return str.replace(/\r\n/g, " ").replace(/\s+/g, " ");
};

// ===================== DOM位置计算工具 =====================

/**
 * 防止元素超出窗口边界的定位计算
 * 根据目标元素的DOMRect和期望的浮层尺寸，计算不超出窗口的摆放坐标
 * 确保翻译弹窗始终在可视区域内显示
 * @param params - 位置计算参数
 * @param params.boxWidth - 浮层宽度
 * @param params.boxHeight - 浮层高度
 * @param params.domRect - 目标元素的边界矩形
 * @param params.gap - 浮层与目标元素的间距
 * @returns 计算后的x,y坐标对象
 */
export const preventBeyondWindow = ({
  boxWidth,
  boxHeight,
  domRect,
  gap,
}: {
  boxWidth: number;
  boxHeight: number;
  domRect: DOMRect;
  gap: number;
}) => {
  // 初始位置：目标元素右侧中央，间距为gap
  let x = domRect.right - domRect.width / 2 - boxWidth / 2 + window.scrollX;
  let y = domRect.top + domRect.height + window.scrollY + gap;

  // 水平边界检查：确保浮层不会超出左右边界
  if (x < 0) {
    x = 0;  // 左边边界修正
  }
  if (x + boxWidth > window.innerWidth + window.scrollX) {
    x = window.innerWidth + window.scrollX - boxWidth;  // 右边边界修正
  }
  
  // 垂直边界检查：如果底部超出窗口，则显示在目标元素上方
  if (y + boxHeight > window.innerHeight + window.scrollY) {
    y = window.scrollY + domRect.top - boxHeight - 20;  // 上方显示，20为安全间距
  }
  
  return { x, y };
};

// ===================== 单词比较工具 =====================

/**
 * 比较两个单词是否相同（忽略大小写和前后空格）
 * 用于单词匹配和去重逻辑
 * @param word1 - 第一个单词
 * @param word2 - 第二个单词
 * @returns 是否为相同单词
 */
export const isSameWord = (word1: string, word2: string) => {
  if (!word1 || !word2) {
    return false;  // 空值直接返回false
  }
  return word1.trim().toLocaleLowerCase() === word2.trim().toLocaleLowerCase();
};

/**
 * 从单词列表中查找指定单词
 * 使用isSameWord进行模糊匹配
 * @param params - 查找参数
 * @param params.word - 要查找的单词
 * @param params.swwList - 单词列表
 * @returns 找到的单词对象，未找到返回undefined
 */
export const getCollectWord = ({
  word,
  swwList,
}: {
  word: string;
  swwList: Sww[];
}) => {
  return swwList.find((item) => {
    return isSameWord(item.word, word);
  });
};

/**
 * 检查单词列表中是否包含指定单词
 * 使用isSameWord进行模糊匹配
 * @param params - 检查参数
 * @param params.word - 要检查的单词
 * @param params.swwList - 单词列表
 * @returns 是否包含指定单词
 */
export const hasWord = ({
  word,
  swwList,
}: {
  word: string;
  swwList: Sww[];
}) => {
  return Boolean(
    swwList.find((item) => {
      return isSameWord(item.word, word);
    })
  );
};

// ===================== 网络请求工具 =====================

/**
 * 在页面上下文直接发起fetch请求（非通过后台代理）
 * 与background.ts中的backgroundFetch行为一致，仅运行环境不同
 * 用于不需要跨域权限的API调用
 * @param param - 请求参数，包含url、method、body、headers等
 * @returns 请求结果，支持多种响应类型
 */
export const backgroundFetch = async (param: BackgroundFetchParam) => {
  const { url, method, responseType } = param;
  const options: Record<string, any> = {
    method: method ?? "GET",  // 默认使用GET方法
  };
  
  // 添加请求体
  if (param.body) {
    options.body = param.body;
  }
  // 添加请求头
  if (param.headers) {
    options.headers = param.headers;
  }
  
  return fetch(url, options).then(async (res) => {
    // 检查响应状态
    if (!res.ok) {
      return {
        error: "fetch failed",
      };
    }
    
    // 根据响应类型处理结果
    if (responseType === "dataURL") {
      // 转换为Data URL（用于图片等二进制数据）
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function () {
          resolve(this.result);
        };
        reader.readAsDataURL(blob);
      });
    } else if (responseType === "text") {
      // 返回文本响应
      return await res.text();
    } else if (responseType === "json") {
      // 返回JSON响应
      return await res.json();
    }
  });
};

/**
 * 通过扩展后台（background）进行跨域请求
 * 使用runtime.sendMessage发送统一的fetch请求参数
 * 利用扩展的background script能力绕过CORS限制
 * @param option - 请求参数
 * @returns 请求结果
 */
export const sendBackgroundFetch = async (option: BackgroundFetchParam) => {
    const browser = (await import("webextension-polyfill")).default;
    const message: ExtensionMessage = {
      type: "fetch",
      payload: option,
    };
    return browser.runtime.sendMessage(message);
};

// ===================== 语言检测工具 =====================

/**
 * 判断输入在当前语言语境下是否可视为一个"词"
 * 优先使用Intl.Segmenter进行智能分词
 * 在不支持且为英文环境时回退为空格分词判断
 * @param params - 检测参数
 * @param params.input - 要检测的输入文本
 * @param params.lang - 语言代码（可选，默认使用浏览器语言）
 * @returns 是否为单个词
 */
export function isWord({
  input,
  lang,
}: {
  input: string;
  lang: string | undefined;
}) {
  if (!input) {
    throw new Error("input is empty");
  }
  
  const text = input.trim();
  const sourceLanguage = lang ?? navigator.language;
  
  // 获取Intl.Segmenter构造函数
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { Segmenter } = Intl as any;
  
  // 如果不支持Intl.Segmenter且是英文环境，使用简单的空格分割判断
  if (!Segmenter && sourceLanguage.indexOf("en") !== -1) {
    if (input.split(" ").length === 1) {
      return true;
    } else {
      return false;
    }
  }
  
  // 如果完全不支持Segmenter，返回false
  if (!Segmenter) {
    return false;
  }
  
  // 使用Intl.Segmenter进行精确分词
  const segmenter = new Segmenter(sourceLanguage, { granularity: "word" });
  const iterator = segmenter.segment(text)[Symbol.iterator]();
  
  // 检查第一个分词结果是否完全匹配输入
  return iterator.next().value?.segment === text;
}

// ===================== 消息格式化工具 =====================

/**
 * 针对不同AI引擎的role兼容性处理
 * 例如文心不支持system role，将其映射为user role
 * 确保各AI引擎都能正确理解消息格式
 * @param engine - AI引擎类型
 * @param messages - 原始消息数组
 * @returns 格式化后的消息数组
 */
export const formateMessage = (engine: EngineValue, messages: Message[]) => {
  if (engine === "wenxin") {
    // 文心一言特殊处理：将system role转换为user role
    return messages.map((item) => ({
      role: item.role === "system" ? "user" : item.role,
      content: item.content,
    }));
  }
  // 其他引擎保持原始格式
  return messages;
};

// ===================== 流式数据处理工具 =====================

/**
 * 处理流式（SSE）增量数据
 * 传入reader与数据回调，将解析后的event.data持续回抛
 * 用于AI聊天的流式响应处理
 * @param reader - 可读流读取器
 * @param onData - 数据回调函数
 */
export async function handleStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onData: (data: string) => void
) {
  // 创建SSE解析器
  const parser = createParser((event) => {
    if (event.type === "event") {
      onData(event.data);
    }
  });
  
  // 持续读取流数据
  // eslint-disable-next-line
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;  // 流结束
    }
    // 解码二进制数据并解析
    const text = new TextDecoder().decode(value);
    parser.feed(text);
  }
}

// ===================== 图片处理工具 =====================

/**
 * 递归计算图片压缩比例
 * 确保压缩后的图片尺寸不超过最大限制
 * @param params - 图片尺寸参数
 * @param params.width - 原始宽度
 * @param params.height - 原始高度
 * @returns 压缩后的尺寸
 */
function compressRatio({ width, height }: { width: number; height: number }) {
  const maxLimit = 500;  // 最大边长限制
  
  if (width > maxLimit || height > maxLimit) {
    // 按80%比例递归压缩直到符合要求
    width = Math.floor(width * 0.8);
    height = Math.floor(height * 0.8);
    return compressRatio({ width, height });
  } else {
    return { width, height };
  }
}

/**
 * 将图片文件压缩为WebP格式
 * 控制最大边界并输出Blob对象
 * 用于减少图片传输大小和存储空间
 * @param img - 原始图片文件
 * @returns 压缩后的Blob对象
 */
export function compressImg(img: File) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const reader = new FileReader();
    
    reader.addEventListener("load", function (e) {
      const newImg = new Image();
      newImg.onload = function () {
        // 计算压缩后的尺寸
        const { width, height } = compressRatio({
          width: newImg.width,
          height: newImg.height,
        });
        
        // 设置canvas尺寸并绘制图片
        canvas.width = width;
        canvas.height = height;
        ctx!.drawImage(newImg, 0, 0, canvas.width, canvas.height);
        
        // 转换为WebP格式的Blob
        canvas.toBlob(
          function (blob) {
            resolve(blob);
          },
          "image/webp",
          0.8  // 压缩质量
        );
      };
      newImg.src = e.target!.result as string;
    });
    reader.readAsDataURL(img);
  });
}

// ===================== 选区和编辑检测工具 =====================

/**
 * 检查当前选中区域是否在可编辑元素中
 * 用于确定是否显示翻译扩展的某些功能
 * @returns 是否在编辑元素中选中文本
 */
export const isSelectionInEditElement = () =>
  document.activeElement instanceof HTMLTextAreaElement ||
  document.activeElement instanceof HTMLInputElement;

// ===================== iframe窗口管理工具 =====================

/**
 * iframe窗口管理器
 * 用于跨iframe的消息传递和窗口引用管理
 * 提供统一的接口来获取和设置iframe窗口引用
 */
const iframeWindowManager = () => {
  let iframeWindow: MessageEventSource | undefined = undefined;
  return {
    getIframeWindow() {
      return iframeWindow;
    },
    setIframeWindow(param: MessageEventSource) {
      iframeWindow = param;
    },
  };
};

// 导出单例实例
export const { getIframeWindow, setIframeWindow } = iframeWindowManager();

// ===================== 选区信息管理 =====================

/**
 * 当前选区信息存储
 * 用于在扩展的各个部分之间共享选中的单词和上下文信息
 */
export const currentSelectionInfo: {
  word: string;
  context: string;
} = {
  word: "",
  context: "",
};

// ===================== 扩展功能工具 =====================

/**
 * 请求后台进行当前标签页截图
 * 将base64数据通过消息发回内容脚本
 * 用于实现页面截图功能
 */
export const screenshot = async () => {
  const browser = (await import("webextension-polyfill")).default;
  
  // 截取当前可见标签页
  const res = await browser.tabs.captureVisibleTab();
  
  // 获取当前活跃标签页
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  
  // 发送截图数据到内容脚本
  const message: ExtensionMessage = {
    type: "onScreenDataurl",
    payload: res,
  };
  browser.tabs.sendMessage(tabs[0].id!, message);
};

/**
 * 询问内容脚本获取当前窗口选区信息
 * 包括选中的文本和上下文信息
 * @returns 选区信息对象
 */
export const getWindowSelectionInfo = async () => {
  const browser = (await import("webextension-polyfill")).default;
  
  // 获取当前活跃标签页
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  
  // 发送获取选区信息的请求
  const message: ExtensionMessage = {
    type: "getCurWindowSelectionInfo",
  };
  return await browser.tabs.sendMessage(tabs[0].id!, message);
};

// ===================== 数据解析工具 =====================

/**
 * 解析柯林斯词典HTML内容
 * 提取音标、词性定义和例句信息
 * @param html - 柯林斯词典页面的HTML内容
 * @returns 解析后的单词对象
 */
export const parseCollins = (html: string) => {
  const result: CollinsWord = {
    phonetic: null,
    explains: [],
  };
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  // 提取音标信息
  const cobuildItms = Array.from(
    doc.querySelectorAll(".definitions.cobuild .hom")
  );
  
  // 获取单词发音
  result.phonetic = doc.querySelector(".dictionary .pron")?.textContent;
  
  // 提取每个定义项的信息
  cobuildItms.forEach((item) => {
    result.explains.push({
      pos: item.querySelector(".gramGrp")?.textContent,      // 词性
      def: item.querySelector(".def")?.textContent,          // 释义
      examples: Array.from(item.querySelectorAll(".type-example"))?.map(
        (quote) => quote.textContent                         // 例句
      ),
    });
  });
  
  return result;
};

// ===================== 环境检测工具 =====================

/**
 * 检查当前是否在扩展popup页面中运行
 * 通过检测location.protocol来判断
 * @returns 是否在popup环境中
 */
export const isInPopup = /extension/.test(location.protocol);

// ===================== 图片转换工具 =====================

/**
 * 将Base64图片字符串转换为Blob对象
 * 用于处理截图等返回base64数据的场景
 * @param base64 - Base64编码的图片字符串
 * @returns 转换后的Blob对象
 */
export function base64ToBlob(base64: string): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext("2d");
      ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // 转换为WebP格式，压缩质量为50%
      canvas.toBlob(
        function (blob) {
          resolve(blob!);
        },
        "image/webp",
        0.5
      );
    };
  });
}
