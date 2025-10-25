/**
 * AI提示词生成工具
 * - 根据不同的翻译场景生成相应的提示词模板
 * - 支持单词翻译和句子翻译两种模式
 * - 提供标准的输出格式规范，确保AI回答的一致性
 * - 支持上下文感知的智能提示词生成
 */
import { codeBlock, oneLineTrim } from "common-tags"
import { isSameWord } from ".";

/**
 * 生成单词翻译提示词
 * 根据单词和上下文信息生成适合AI模型的提示词模板
 * @param params - 提示词参数对象
 * @param params.word - 要翻译的单词
 * @param params.context - 上下文句子（可选，用于提供语境）
 * @param params.targetLanguage - 目标翻译语言
 * @returns 提示词对象，包含角色设定、指令和内容三部分
 */
export const getWordPrompt = ({word,context,targetLanguage}:{word:string,context?:string,targetLanguage:string}) => {
  // 单词模式提示词：定义AI角色和详细翻译要求
  // 包括音标、词性、含义、双语示例等完整信息
  const rolePrompt = codeBlock`
      ${oneLineTrim`
      你是一个翻译引擎，翻译的目标语言为${targetLanguage}，只需要翻译不需要解释。
      当只给出一个单词时，
      请给出单词原始形态（如果有）、
      单词的语种、
      对应的音标或转写、
      所有含义（含词性）、
      双语示例，至少三条例句。`}


      ${oneLineTrim`当给出句子和句子中的某个单词或词组时，
      请给出单词原始形态（如果有）、
      单词的语种、
      对应的音标或转写、
      单词在句子中的含义（含词性）、
      使用该含义的三条双语例句。
      请严格按照下面格式给到翻译结果：`}
          <单词>
          [<语种>]· / <Pinyin> /
          [<词性缩写>] <中文含义>]（如果同时给出了句子，解释单词在句子中的含义）
          [<句子的含义>]（如果同时给出了句子）
          例句：
          <序号><例句>(例句翻译)
          词源：
          <词源>
      `
  
  // 指令提示词：简单的确认回应
  const commandPrompt = '好的，我明白了，请给我这个单词。';
  
  // 内容提示词：根据是否提供上下文生成不同的用户输入
  let contentPrompt = '';
  if (!context || isSameWord(word,context)) {
    // 没有上下文或上下文与单词相同时，仅提供单词
    contentPrompt = `单词是：${word}。`
  } else {
    // 有上下文时，同时提供单词和句子
    contentPrompt = `单词是：${word}，句子是：${context}`
  }
 
  // 返回完整的提示词对象
  return {rolePrompt, commandPrompt, contentPrompt}
}

/**
 * 生成句子翻译提示词
 * 为句子翻译场景生成适合AI模型的提示词模板
 * @param text - 要翻译的文本
 * @param targetLanguage - 目标翻译语言
 * @returns 提示词对象，包含角色设定、指令和内容三部分
 */
export const getSentencePrompt = (text:string,targetLanguage:string) => {
  // 句子翻译角色设定：要求自然、专业的翻译风格
  const rolePrompt = `You are a translator. Please translate the text into a colloquial, professional, elegant and fluent content, without the style of machine translation.`;
  
  // 简单确认指令
  const commandPrompt = `OK.`;
  
  // 翻译任务内容
  const contentPrompt = `Translate the following text to ${targetLanguage}:${text}`;
  
  // 返回完整的提示词对象
  return {
    rolePrompt,
    commandPrompt,
    contentPrompt
  }
}