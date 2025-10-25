/**
 * 模块概述：聊天引擎选择器
 * - 根据用户在设置中选择的聊天/翻译引擎，返回对应实现类（构造器）。
 *
 * 对外暴露：
 * - getChat(engine): 根据传入的引擎值返回类，用于 new 后进行会话。
 */
import OpenAIClass from "@/api/openAI";
import DeepSeekClass from "@/api/deepSeek";
import GeminiClass from "@/api/gemini";
import WenxinClass from "@/api/wenxin";
import type { EngineValue } from "@/types";
import MoonShotClass from "./moonShot";
import CustomAIClass from "./customAI";

/**
 * 根据引擎类型返回对应的聊天实现类（构造器）。
 * @param engine 引擎枚举值，来源于设置（Setting.engine）。
 * @returns 可用于实例化的类，例如 OpenAIClass / GeminiClass 等。
 */
export const getChat = (engine:EngineValue) => {
  switch (engine) {
    case 'openai':
      return  OpenAIClass
    case "gemini":          
      return  GeminiClass
    case "wenxin":
      return  WenxinClass
    case "moonshot":
      return  MoonShotClass
    case "deepseek":
      return  DeepSeekClass
    case "custom":
      return  CustomAIClass
  }
}
