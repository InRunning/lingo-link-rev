/**
 * 单词收集表单组件
 * - 用于用户收集和保存学习的单词
 * - 支持实时表单状态管理和验证
 * - 包含单词、语境和备注三个核心字段
 * - 支持两种尺寸样式（sm/md）
 * - 集成富文本编辑器用于备注输入
 * - 支持社区分享功能提示
 */
import { useTranslation } from "react-i18next";
import Editor from "./Editor";
import { X } from "lucide-react";
import { collectInputBasicAtom } from "@/store";
import { useImmerAtom } from "jotai-immer";
import { useState } from "react";

/**
 * 单词收集表单组件
 * 提供一个结构化的界面让用户收集和管理学习到的单词
 * @param props - 组件属性
 * @param props.size - 表单尺寸（sm: 小号，md: 中号）
 * @param props.showCloseIcon - 是否显示关闭图标
 * @param props.onCancel - 取消收集的回调函数
 * @param props.onSubmit - 提交保存的异步回调函数
 * @returns 单词收集表单React组件
 */
export default function CollectForm({
  size,
  showCloseIcon,
  onCancel,
  onSubmit,
}: {
  size?: "sm" | "md";
  showCloseIcon?: boolean;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}) {
  // ===================== 国际化支持 =====================

  /** React-i18next翻译函数 */
  const { t } = useTranslation();

  // ===================== 状态管理 =====================

  /** 表单提交加载状态 */
  const [loading, setLoading] = useState(false);
  
  /** 全局收集信息状态 - 使用Immer进行不可变状态更新 */
  const [collectSwwInfo, setCollectBasicInfo] = useImmerAtom(
    collectInputBasicAtom
  );

  // ===================== 事件处理 =====================

  /**
   * 处理表单提交
   * - 设置加载状态防止重复提交
   * - 执行外部传入的提交回调
   * - 完成后恢复加载状态
   */
  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit();  // 执行外部传入的异步提交逻辑
    setLoading(false);
  };

  // ===================== 渲染逻辑 =====================

  return (
    <div className="relative text-[14px] grid grid-cols-1 gap-4">
      {/* 关闭按钮（可选） */}
      {showCloseIcon && (
        <div className="p-0 absolute z-10 right-0 top-0">
          <X
            onClick={onCancel}
            className="cursor-pointer  w-[18px] h-[18px]"
            title="关闭"  // 鼠标悬停提示
          />
        </div>
      )}

      {/* 单词输入字段 */}
      <label className="block">
        <span className="font-semibold">{t("Word to Save")}</span>
        <div className="flex items-center">
          <input
            required
            value={collectSwwInfo?.word ?? ""}
            onChange={(e) => {
              setCollectBasicInfo((draft) => {
                draft!.word = e.target.value;  // 更新单词字段
              });
            }}
            type="text"
            placeholder="word"
            className={`placeholder:text-base-content/50 mt-1 input input-bordered w-full ${
              size === "sm" ? "input-sm" : ""
            }`}
          />
        </div>
      </label>

      {/* 语境输入字段 */}
      <label className="block">
        <span className="font-semibold">
          {t("Sentence Containing the Word")}
        </span>
        <textarea
          required
          value={collectSwwInfo?.context}
          onChange={(e) => {
            setCollectBasicInfo((draft) => {
              draft!.context = e.target.value;  // 更新语境字段
            });
          }}
          rows={2}
          className={`placeholder:text-base-content/50 block mt-1 w-full textarea textarea-bordered ${
            size === "sm" ? "textarea-sm" : ""
          }`}
          placeholder="context"
        />
      </label>

      {/* 备注字段 */}
      <label className="block">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{t("Remark")}</span>
          <span className="text-[12px]">
            {/* 社区分享提示信息 */}
            目前笔记数据会在
            <a
              className="text-blue-500 underline"
              target="community"
              href="https://words.mywords.cc/recommend"
            >
              社区
            </a>
            公开
          </span>
        </div>
        <Editor />  {/* 富文本编辑器组件 */}
      </label>

      {/* 操作按钮区域 */}
      <div className="flex justify-end items-center">
        {/* 取消按钮 */}
        <button
          onClick={onCancel}
          className={`btn ${size === "sm" ? "btn-sm" : ""}`}
        >
          {t("Cancel")}
        </button>
        
        {/* 保存按钮 */}
        <button
          disabled={!collectSwwInfo?.word || !collectSwwInfo.context || loading}  // 表单验证
          onClick={handleSubmit}
          className={`${size === "sm" ? "btn-sm" : ""} btn btn-primary ml-2`}
        >
          {/* 加载状态指示器 */}
          {loading ? <span className="loading loading-spinner"></span> : null}
          {t("Save")}
        </button>
      </div>
    </div>
  );
}
