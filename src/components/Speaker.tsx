/**
 * 组件：有道语音播放组件
 * - 集成有道词典语音API，支持多种语言的文本转语音
 * - 使用Web Audio API处理音频播放和控制
 * - 支持自动播放（需用户交互触发）和手动播放
 * - 包含动态语音动画效果（播放时显示动态图标）
 */
import { useState, useRef, useEffect } from "react";
import {
  Volume2 as SpeakerLoudIcon,     // 大音量图标
  Volume1 as SpeakerModerateIcon, // 中音量图标
  Volume as SpeakerQuietIcon,     // 小音量图标
} from "lucide-react";
import { sendBackgroundFetch } from "@/utils";
import {pageClicked} from '@/utils/pageClicked'  // 页面点击状态检测
import { isInPopup } from "@/utils";
import '@/assets/styles/sperkerMotion.css'  // 语音动画样式

/**
 * YoudaoAudio类：封装有道语音播放逻辑
 * - 处理语音文件的获取、解码和播放
 * - 管理AudioContext和AudioBuffer的生命周期
 * - 提供播放状态回调和资源清理功能
 */
class YoudaoAudio {
  // 回调函数
  onplay: () => void;     // 播放开始回调
  onended: () => void;    // 播放结束回调
  
  // 配置参数
  text: string;           // 要播放的文本
  type: string;          // 语音类型（1-英音，2-美音等）
  lang: string;          // 语言代码
  
  // 音频相关
  context: AudioContext | null;  // Web Audio上下文
  audioBuffer: AudioBuffer | null; // 音频数据缓冲区
  close: ()=>void         // 资源清理方法
  
  /**
   * YoudaoAudio构造函数
   * @param config - 配置对象
   */
  constructor({
    text,
    type,
    lang,
    onplay,
    onended,
    autoPlay,
  }: {
    text: string;
    type: string;
    lang:string;
    onplay: () => void;
    onended: () => void;
    autoPlay: boolean;
  }) {
    // 初始化回调函数和配置
    this.onplay = onplay;
    this.onended = onended;
    this.lang = lang;
    this.type = type;
    this.text = text;
    this.audioBuffer = null;
    
    // 资源清理方法
    this.close = ()=> this.context?.close()
    
    // 如果启用自动播放且满足条件，初始化AudioContext并开始播放
    if (autoPlay && pageClicked && !isInPopup) {
      this.context = new AudioContext();
      this.play();
    } else {
      this.context = null;
    }
  }
  
  /**
   * 从有道API获取语音数据并解码
   * - 通过background script发送跨域请求
   * - 将base64数据转换为AudioBuffer
   */
  async fetch() {
    // 从有道语音API获取base64编码的音频数据
    const base64String = await sendBackgroundFetch({
      url:  `https://dict.youdao.com/dictvoice?audio=${this.text}&le=${this.lang}&type=${this.type}`,
      responseType: "dataURL",
    });
    
    // 提取base64数据部分（去除data:前缀）
    const base64Data = base64String.split(",")[1] || base64String;
    
    // 将base64字符串转换为ArrayBuffer
    const audioData = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(audioData.length);
    const view = new Uint8Array(arrayBuffer);
    
    // 逐字节转换
    for (let i = 0; i < audioData.length; i++) {
      view[i] = audioData.charCodeAt(i);
    }
    
    // 使用Web Audio API解码音频数据
    const data = await this.context?.decodeAudioData(arrayBuffer);
    this.audioBuffer = data ?? null;
  }
  
  /**
   * 播放语音
   * - 确保AudioContext已初始化
   * - 必要时获取并解码音频数据
   * - 创建AudioBufferSourceNode并播放
   */
  async play() {
    // 确保AudioContext已创建
    if (!this.context) {
      this.context = new AudioContext();
    }
    
    // 如果没有音频缓冲区，先获取并解码
    if (!this.audioBuffer) {
      await this.fetch();
    }
    
    // 创建音频源节点
    const audioBufferSourceNode = new AudioBufferSourceNode(this.context);
    audioBufferSourceNode.buffer = this.audioBuffer;
    audioBufferSourceNode.connect(this.context.destination);
    
    // 触发播放开始回调
    this.onplay();
    
    // 开始播放并设置结束回调
    audioBufferSourceNode.start();
    audioBufferSourceNode.onended = this.onended;
  }
}

// 语音图标尺寸常量
const width = 16;
const height = 16;

/**
 * YoudaoSpeaker主组件
 * - 提供语音播放的用户界面
 * - 管理播放状态和音频实例
 * - 支持播放时的动态视觉效果
 */
export default function YoudaoSpeaker({
  text,
  autoPlay,
  lang,
  type = "2", // 英语：lang=1(英音) lang=2(美音)
  className
}: {
  text: string;
  lang:string,
  autoPlay: boolean;
  type?: string;
  className?:string
}) {
  // 播放状态管理
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  // YoudaoAudio实例引用
  const youdaoAudioInstance = useRef<YoudaoAudio | null>(null);
  
  /**
   * 手动播放语音处理函数
   */
  const handlePlay = () => {
    youdaoAudioInstance.current?.play();
  };
  
  /**
   * 初始化YoudaoAudio实例Effect
   * - 创建音频实例并设置播放回调
   * - 处理组件卸载时的资源清理
   */
  useEffect(() => {
    // if (youdaoAudioInstance.current){return} // 注释：可能用于避免重复创建
    
    // 创建新的YoudaoAudio实例
    youdaoAudioInstance.current = new YoudaoAudio({
      text,
      lang,
      type,
      onplay: () => {
        setIsAudioPlaying(true);  // 设置为播放状态
      },
      onended: () => {
        setIsAudioPlaying(false); // 设置为停止状态
      },
      autoPlay,
    });
    
    // 组件卸载时清理资源
    return () => {
      youdaoAudioInstance.current?.close()
    }
  }, [text, type,lang,autoPlay]);
 
  /**
   * 渲染语音播放界面
   * - 播放时显示动态语音图标
   * - 停止时显示可点击的播放图标
   */
  return (
    <div
      className={`inline-flex items-center`}
    >
      {/* 播放状态：显示动态语音效果 */}
      {isAudioPlaying ? (
        <span className={`relative inline-block ${className}`} style={{width,height}}>
          <SpeakerLoudIcon className={`speakerLoud w-full h-full`} />
          <SpeakerModerateIcon className={`speakerModerate w-full h-full`} />
          <SpeakerQuietIcon className={`speakerQuiet w-full h-full`} />
        </span>
      ) : (
        // 停止状态：显示可点击的播放图标
        <SpeakerLoudIcon
          className={`hover:text-sky-600 cursor-pointer ${className}`}
          style={{width,height}}
          onClick={handlePlay}
        />
      )}
    </div>
  );
}
