/**
 * 页面：数据管理（欧路词典同步）
 * - 配置欧路开放平台 Token、学习语言、生词本，并控制是否开启同步
 * - 通过接口获取欧路生词本列表，持久化到设置中
 * - 实现用户词典与欧路词典的同步功能
 * - 支持多语言学习材料的管理
 */
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toastManager } from "@/components/Toast";
import { useAtom } from "jotai";
import { settingAtom } from "@/store";

// ===================== 欧路词典支持语言配置 =====================

/**
 * 欧路词典支持的学习语言
 * 定义了常用的几种外语学习选项
 */
const ouluLang = [
  {
    name: "English",  // 英语
    value: "en",
  },
  {
    name: "French",   // 法语
    value: "fr",
  },
  {
    name: "Deutsch",  // 德语
    value: "de",
  },
  {
    name: "Spanish",  // 西班牙语
    value: "es",
  },
];

/**
 * 数据管理页面主组件
 * 处理欧路词典平台的集成和同步设置
 * @returns 数据管理页面React组件
 */
export default function DataManage() {
  // ===================== 全局状态管理 =====================

  const { t } = useTranslation();
  
  /** 扩展设置状态 */
  const [setting, setSetting] = useAtom(settingAtom);
  
  /** 欧路词典信息（从全局设置中解构） */
  const ouluInfo = setting.ouluInfo;
  
  /** 生词本列表加载状态 */
  const [booksLoading, setBooksLoading] = useState(false);

  // ===================== API调用函数 =====================

  /**
   * 获取欧路词典生词本列表
   * 通过欧路开放API获取用户可用的生词本列表
   * 包含完整的错误处理和加载状态管理
   */
  const getBookList = () => {
    // ===================== 请求参数验证 =====================
    
    /** 检查是否正在加载中，避免重复请求 */
    if (booksLoading) {
      return;
    }
    
    /** 验证授权token是否存在 */
    if (!ouluInfo?.token) {
      toastManager.add({
        type: "error",
        msg: "授权token为空",
      });
      return;
    }
    
    /** 验证目标语言是否已选择 */
    if (!ouluInfo?.targetBookLang) {
      toastManager.add({
        type: "error",
        msg: "生词本语言为空",
      });
      return;
    }

    // ===================== 设置加载状态 =====================
    
    setBooksLoading(true);

    // ===================== 发起API请求 =====================

    /**
     * 调用欧路词典开放平台API
     * 获取指定语言下的所有生词本列表
     * 使用Bearer Token进行身份认证
     */
    fetch(
      `https://api.frdic.com/api/open/v1/studylist/category?language=${ouluInfo.targetBookLang}`,
      {
        headers: {
          Authorization: ouluInfo.token,
        },
      }
    )
      .then((res) => res.json())  // 解析JSON响应
      .then((res) => {
        // ===================== 存储生词本列表 =====================
        /**
         * 将获取到的生词本列表保存到全局设置中
         * 使用展开运算符保持现有属性不变
         */
        setSetting({ ouluInfo: { ...ouluInfo, bookList: res.data } });
      })
      .finally(() => {
        // ===================== 清理加载状态 =====================
        /**
         * 无论请求成功或失败，都需要重置加载状态
         * 确保用户界面恢复正常交互状态
         */
        setBooksLoading(false);
      });
  };

  // ===================== 主界面渲染 =====================

  return (
    <div className="w-[600px] space-y-5">
      <div>
        {/* ===================== 页面标题 ===================== */}
        <div className="font-semibold text-[17px] mb-3">{t("Oulu Dic")}</div>
        
        {/* ===================== 主配置区域 ===================== */}
        <div className="border rounded-xl p-9">
          
          {/* ===================== 授权Token配置 ===================== */}
          <div>
            <div className="text-[15px] my-2">
              <span>{t("Oulu Token")}</span>
              {/* Token获取方法链接 */}
              <a
                target="_blank"
                className="ml-3 text-xs underline text-indigo-400"
                href="https://my.eudic.net/OpenAPI/Authorization"
              >
                {t("Method of acquisition")}
              </a>
            </div>
            {/* Token输入框 */}
            <input
              onChange={(e) => {
                setSetting({
                  ouluInfo: { ...ouluInfo, token: e.target.value },
                });
              }}
              value={ouluInfo?.token ?? ""}
              type="text"
              placeholder=""
              className="input input-bordered w-full"
            />
          </div>

          {/* ===================== 学习语言选择 ===================== */}
          <div>
            <div className="text-[15px] my-2">
              {t("Oulu Learning Language")}
            </div>
            {/* 语言选择下拉框 */}
            <select
              value={ouluInfo?.targetBookLang ?? ""}
              onChange={(e) => {
                setSetting({
                  ouluInfo: { ...ouluInfo, targetBookLang: e.target.value },
                });
              }}
              className="select select-bordered w-full flex-auto"
            >
              <option disabled value={""}>
                Please Select
              </option>
              {ouluLang.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {/* ===================== 生词本选择和同步状态 ===================== */}
          <div>
            <div className="text-[15px] my-2">{t("Vocabulary Notebook")}</div>
            
            {/* 生词本选择区域 */}
            <div
              className={`flex transition-opacity ${
                booksLoading ? "opacity-50" : "opacity-100"
              }`}
            >
              {/* 生词本选择下拉框 */}
              <select
                value={ouluInfo?.targetBookId ?? ""}
                onChange={(e) => {
                  setSetting({
                    ouluInfo: { ...ouluInfo, targetBookId: e.target.value },
                  });
                }}
                className="select select-bordered w-full flex-auto"
              >
                <option disabled value={""}>
                  Please Select
                </option>
                {/* 显示获取到的生词本列表 */}
                {ouluInfo?.bookList?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              
              {/* 刷新按钮 */}
              <button onClick={getBookList} className="btn btn-square ml-2">
                {booksLoading ? (
                  /* 加载中的旋转指示器 */
                  <span className="w-5 loading loading-spinner"></span>
                ) : (
                  /* 刷新图标 */
                  <RotateCcw className="w-5" />
                )}
              </button>
            </div>

            {/* ===================== 同步状态开关 ===================== */}
            <div className="">
              <div className="my-2">{t("Synchronization Status")}</div>
              <div className="flex items-center">
                {/* 同步状态开关 */}
                <input
                  type="checkbox"
                  onChange={(e) => {
                    setSetting({
                      ouluInfo: { ...ouluInfo, open: e.target.checked },
                    });
                  }}
                  checked={ouluInfo?.open ?? false}
                  className="checkbox"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
