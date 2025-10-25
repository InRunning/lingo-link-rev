/**
 * 组件：外部链接显示组件
 * - 根据用户设置显示相关的外部词典和翻译服务链接
 * - 支持动态替换链接中的{text}占位符为实际搜索文本
 * - 从全局设置中获取外部链接配置，支持自定义
 * - 用于在翻译结果下方显示相关资源的快速访问链接
 */
import { settingAtom } from "@/store";
import { defaultSetting } from "@/utils/const";
import { useAtom } from "jotai";

/**
 * ExternalLink组件参数接口
 * @param searchText - 当前搜索的文本内容
 */
export default function ExternalLink({ searchText }: { searchText: string }) {
  // 获取全局设置状态
  const [setting] = useAtom(settingAtom);
  
  // 获取外部链接配置，优先使用用户自定义设置，否则使用默认设置
  const links = setting.externalLinks ?? defaultSetting.externalLinks;
  
  return (
    <div className="flex items-center gap-1 text-xs">
      {/* 渲染所有外部链接 */}
      {links.map((item) => (
        <a
          key={item.id}
          className="underline"
          target={item.name}  // 使用链接名称作为target属性
          href={item.link.replace(/\{text\}/, function () {
            return searchText;  // 替换链接中的{text}占位符为实际搜索文本
          })}
        >
          {item.name}  {/* 显示链接名称 */}
        </a>
      ))}
    </div>
  );
}
