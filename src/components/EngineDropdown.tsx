/**
 * 组件：翻译引擎选择下拉菜单
 * - 支持单词引擎和句子引擎的切换选择
 * - 鼠标悬停控制下拉菜单显示/隐藏
 * - 智能布局：根据引擎数量和类型调整下拉菜单位置
 * - 使用radio button提供单选功能
 * - 支持鼠标移入移出的防抖处理，提升用户体验
 */
import { EngineValue, EngineItem } from "@/types";
import { allSentenceEngineList, allWordEngineList } from "@/utils/const";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAtom } from "jotai";
import { settingAtom } from "@/store";

/**
 * EngineDropdown组件参数接口
 * @param onChange - 引擎选择变化的回调函数
 * @param currentEngine - 当前选中的引擎值
 * @param className - 自定义CSS类名
 * @param isWord - 是否为单词引擎模式（true=单词引擎，false=句子引擎）
 */
export default function EngineDropdown({
  onChange,
  currentEngine,
  className,
  isWord,
}: {
  currentEngine: EngineValue;
  onChange: (engine: EngineValue) => void;
  className?: string;
  isWord: boolean;
}) {
  // 获取全局设置状态
  const [setting] = useAtom(settingAtom);
  
  // 下拉菜单状态：open=显示，close=隐藏
  const [dropdownState, setDropdownState] = useState<"open" | "close">("close");
  
  // 当前选中引擎的显示名称
  const [curEngineName, setCurEngineName] = useState("");
  
  // 鼠标移出定时器引用，用于防抖控制
  const timer = useRef<number | null>(null);
  
  /**
   * 处理引擎选择变化
   * @param item - 被选中的引擎项
   */
  const handleChange = (item: EngineItem) => {
    onChange(item.value);      // 调用回调函数更新引擎
    setDropdownState("close"); // 关闭下拉菜单
  };
  
  /**
   * 处理标签区域的鼠标离开事件
   * - 延迟400ms关闭菜单，给用户时间移动到菜单项
   */
  const handleLabelMouseleave = () => {
    timer.current = window.setTimeout(() => {
      setDropdownState("close");
    }, 400);
  };
  
  /**
   * 处理鼠标进入事件
   * - 清除之前的定时器，立即显示菜单
   */
  const handleMouseenter = () => {
    timer.current && clearTimeout(timer.current);
    setDropdownState("open");
  };
  
  /**
   * 处理下拉内容的鼠标离开事件
   * - 延迟50ms关闭菜单（比标签区域更短的延迟）
   */
  const handleContentMouseleave = () => {
    timer.current = window.setTimeout(() => {
      setDropdownState("close");
    }, 50);
  };
  
  /**
   * 获取可用的引擎列表
   * - 根据isWord参数选择单词引擎或句子引擎
   * - 只显示已启用的引擎（checked = true）
   */
  const engines = isWord
    ? (setting.wordEngineList ?? allWordEngineList).filter(
        (item) => item.checked  // 只显示启用的单词引擎
      )
    : (setting.sentenceEngineList ?? allSentenceEngineList).filter(
        (item) => item.checked  // 只显示启用的句子引擎
      );

  /**
   * 更新当前引擎显示名称Effect
   * - 当引擎列表或当前引擎变化时更新显示名称
   */
  useEffect(() => {
    const findItem = engines.find((item) => item.value === currentEngine);
    setCurEngineName(findItem?.name ?? "");
  }, [engines, currentEngine]);

  /**
   * 水平排列版本（已注释）
   * 可以通过取消注释启用，显示为水平按钮组而不是下拉菜单
   */
  // return (
  //   <div className={`${className}`}>
  //     <ul className={`flex items-center space-x-1 text-[12px]`}>
  //       {engines.map((item) => (
  //         <li
  //           className={`cursor-pointer  px-1 py-[1px] rounded-md   ${
  //             currentEngine === item.value
  //               ? "bg-gray-300 text-black"
  //               : "hover:bg-gray-200"
  //           }`}
  //           onClick={() => handleChange(item)}
  //           // className={`btn btn-xs btn-ghost ${currentEngine === item.value ? 'border-b-2' : ''}`}
  //           key={item.value}
  //         >
  //           {item.name}
  //         </li>
  //       ))}
  //     </ul>
  //   </div>
  // );
  
  /**
   * 主要渲染内容：下拉菜单组件
   * - 包含触发区域（显示当前选中的引擎名称和下拉箭头）
   * - 包含下拉菜单列表（显示所有可用的引擎选项）
   */
  return (
    <div className={`${className}`}>
      {/* 触发区域：显示当前选中的引擎名称和下拉箭头 */}
      <div
        onMouseEnter={handleMouseenter}
        onMouseLeave={handleLabelMouseleave}
        className="cursor-pointer flex items-center"
      >
        <span>{curEngineName}</span>
        <ChevronDown className="stroke-2 w-[15px] h-[15px]" />
      </div>
      
      {/* 下拉菜单列表 */}
      <ul
        onMouseEnter={handleMouseenter}
        onMouseLeave={handleContentMouseleave}
        className={`${dropdownState === "open" ? "visible" : "hidden"} ${
          // 智能布局：句子引擎且引擎数量>2时右对齐，其他情况居中
          engines.length > 2 && !isWord
            ? "min-w-[220px] -right-[50px]"   // 句子引擎右对齐
            : "left-1/2 -translate-x-[50%]"   // 其他情况居中
        } absolute  top-[100%] z-[1] p-1 shadow-xl bg-base-300 rounded-lg overflow-scroll`}
      >
        {/* 渲染所有可用引擎为radio button */}
        {engines.map((item) => (
          <li className={`inline-block  m-[1px]`} key={item.value}>
            <input
              onChange={() => handleChange(item)}
              type="radio"
              className="btn btn-xs btn-ghost"
              value={item.value}
              checked={item.value === currentEngine}
              aria-label={item.name}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
