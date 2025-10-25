/**
 * 用户登录组件
 * - 提供邮箱/密码登录和Google第三方登录功能
 * - 支持加载状态和倒计时重发机制
 * - 集成Jotai状态管理和本地存储
 * - 自动同步用户的单词和备注数据
 * - 支持登录成功后的数据刷新
 * - 浏览器兼容性检测（Firefox/Edge隐藏Google登录）
 */
import { getMyAllRemarkList, getSwwList, login } from "@/api";
import googleIcon from "@/assets/google.png";
import React, { useEffect, useRef, useState } from "react";
import { toastManager } from "@/components/Toast";
import { GoogleLoginError, GoogleUser } from "@/types";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import browser from "webextension-polyfill";
import { useAtom } from "jotai";
import { settingAtom, remarkListAtom, swwListAtom } from "@/store";
import { setLocal} from "@/storage/local";

// ===================== 常量定义 =====================

/** Google图标URL */
const imgUrl = new URL(googleIcon, import.meta.url).href;

/** 检测浏览器类型，决定是否隐藏Google登录按钮（Firefox/Edge不支持） */
const hideGoogleLogin = /Firefox|Edg/.test(navigator.userAgent);

/** 重发验证码倒计时（秒） */
const resendTime = 10;

/** 全局对话框元素引用（用于全局显示函数） */
let dialogEle: HTMLDialogElement | null = null;

/**
 * 用户登录组件
 * 提供多种登录方式，支持登录成功后的数据同步
 * @param props - 组件属性
 * @param props.onSuccess - 登录成功后的回调函数（可选）
 * @returns 登录对话框React组件
 */
export default function Login({ onSuccess }: { onSuccess?: () => void }) {
  // ===================== 国际化支持 =====================

  /** React-i18next翻译函数 */
  const { t } = useTranslation();

  // ===================== 全局状态管理 =====================

  /** 设置状态管理 */
  const [, setSetting] = useAtom(settingAtom);
  
  /** 备注列表状态管理 */
  const [, setRemarkList] = useAtom(remarkListAtom);
  
  /** 单词列表状态管理 */
  const [, setSwwList] = useAtom(swwListAtom);

  // ===================== 本地状态管理 =====================

  /** 加载状态控制 */
  const [loadingShow, setLoadingShow] = useState(false);
  
  /** 倒计时状态控制 */
  const [countdownStatus, setCountdownStatus] = useState(false);
  
  /** 当前倒计时数值 */
  const [countdown, setCountdown] = useState(resendTime);
  
  /** 对话框引用 */
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // ===================== 数据处理函数 =====================

  /**
   * 处理登录结果
   * - 更新用户信息到全局状态
   * - 获取并同步用户的单词和备注列表
   * - 保存数据到本地存储
   * - 显示登录成功提示
   * @param loginRes - 登录API响应结果
   */
  const storeResult = (loginRes: Awaited<ReturnType<typeof login>>) => {
    // 更新用户信息到全局设置状态
    setSetting({
      userInfo: {
        email: loginRes.email,
        id: loginRes.id,
        picture: loginRes.picture,
        name: loginRes.name,
        token: loginRes.token,
      },
    });

    // 获取并同步单词列表
    getSwwList().then(res => {
      if (res?.list instanceof Array) {
        setLocal({ swwList: res.list });  // 保存到本地存储
        setSwwList(res.list);             // 更新全局状态
      }
    });

    // 获取并同步备注列表
    getMyAllRemarkList().then(res => {
      if (res?.list instanceof Array) {
        setLocal({ remarkList: res.list });  // 保存到本地存储
        setRemarkList(res.list);             // 更新全局状态
      }
    });

    // 显示登录成功提示
    toastManager.add({ type: "success", msg: "登录成功" });
  };

  // ===================== 倒计时管理 =====================

  /**
   * 倒计时器Effect
   * 当倒计时状态激活时，每秒减少倒计时数值
   */
  useEffect(() => {
    let timer: number | null = null;
    if (countdownStatus) {
      timer = window.setInterval(() => {
        setCountdown((pre) => pre - 1);
      }, 1000);  // 每秒执行一次
    }
    return () => {
      timer && clearInterval(timer);  // 清理定时器
    };
  }, [countdownStatus]);

  /**
   * 倒计时结束处理
   * 当倒计时数值为0时，停止倒计时
   */
  useEffect(() => {
    if (countdown < 1) {
      setCountdownStatus(false);
      setCountdown(resendTime);  // 重置倒计时数值
    }
  }, [countdown]);

  /**
   * 初始化对话框引用
   * 将对话框引用保存到全局变量，供全局显示函数使用
   */
  useEffect(() => {
    dialogEle = dialogRef.current;
  }, []);

  // ===================== 登录处理函数 =====================

  /**
   * 处理邮箱密码登录提交
   * - 表单验证（邮箱、密码非空）
   * - 调用登录API
   * - 处理登录结果或错误
   * @param e - 表单提交事件
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();  // 阻止默认提交行为
    
    try {
      // 获取表单元素值
      const email = (
        (e.target as HTMLFormElement).elements[0] as HTMLInputElement
      ).value.trim();
      
      const password = (
        (e.target as HTMLFormElement).elements[1] as HTMLInputElement
      ).value.trim();

      // 表单验证
      if (!email) {
        toastManager.add({ type: "error", msg: 'email is empty' });
        return;
      }
      if (!password) {
        toastManager.add({ type: "error", msg: 'password is empty' });
        return;
      }

      // 执行登录请求
      const loginRes = await login({
        email,
        password,
        loginWithGoogle: false,  // 标记为邮箱登录方式
      });

      // 处理登录结果
      storeResult(loginRes);
      
    } catch (error) {
      console.log(error);  // 静默处理错误
    } finally {
      // 清理操作
      dialogRef.current?.close();  // 关闭对话框
      setLoadingShow(false);       // 隐藏加载状态
    }
  };

  /**
   * 处理Google第三方登录
   * - 显示加载状态
   * - 调用浏览器扩展API获取Google授权
   * - 执行登录流程
   * - 同步用户数据
   */
  const googleLogin = async () => {
    try {
      setLoadingShow(true);  // 显示加载状态

      // 向background script请求Google授权
      const res: GoogleUser | GoogleLoginError =
        await browser.runtime.sendMessage({ type: "auth" });

      // 检查授权结果
      if ("error" in res) {
        toastManager.add({ type: "error", msg: res.error_description });
        return;
      } else {
        // 执行登录并同步数据
        const loginRes = await login({ ...res, ...{ loginWithGoogle: true } });
        storeResult(loginRes);
        
        // 执行登录成功回调
        onSuccess && onSuccess();
      }
      
    } catch (error) {
      console.log(error);  // 静默处理错误
    } finally {
      // 清理操作
      dialogRef.current?.close();
      setLoadingShow(false);
    }
  };

  // ===================== 渲染逻辑 =====================

  return (
    <dialog id="login_modal" ref={dialogRef} className="modal z-[2147483647]">
      <div className="relative modal-box max-w-[430px]">
        {/* 加载状态遮罩层 */}
        {loadingShow && (
          <div className="z-10 absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className="loading loading-spinner loading-md text-neutral"></span>
          </div>
        )}

        {/* 关闭按钮 */}
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-[5px] top-[5px] outline-none">
            ✕
          </button>
        </form>

        {/* 登录表单区域 */}
        <div className="space-y-3 p-2">
          {/* 邮箱密码登录表单 */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              {/* 邮箱输入框 */}
              <label className="block">
                <input
                  id="email"
                  placeholder={t("Email")}
                  type="email"
                  required
                  autoComplete="username"
                  className="input input-bordered w-full"
                />
              </label>

              {/* 密码输入框 */}
              <label className="block">
                <input
                  id="password"
                  placeholder={t("Password")}
                  type="password"
                  required
                  autoComplete="current-password"
                  className="input input-bordered w-full"
                />
              </label>

              {/* 登录按钮 */}
              <button type="submit" className="btn btn-block">
                {t("Sign in")}
              </button>

              {/* 登录提示信息 */}
              <div className="flex items-center justify-center opacity-50 text-xs space-x-1">
                <Info className="w-[12px] h-[12px]" />
                <span>{t('Login Tip')}</span>
              </div>
            </div>
          </form>

          {/* Google登录选项（除Firefox/Edge外显示） */}
          {!hideGoogleLogin && (
            <>
              {/* 分隔线 */}
              <div className="divider !my-[30px]">OR</div>

              {/* Google登录按钮 */}
              <div onClick={googleLogin} className="btn btn-block">
                <div>
                  <img width={30} src={imgUrl} alt="Google" />
                </div>
                <div className="leading-tight text-sm font-semibold opacity-80 text-base-content">
                  <div>{t("Sign in with Google")}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

/**
 * 全局显示登录对话框函数
 * 可在任何地方调用来显示登录对话框
 */
export const showLogin = () => {
  dialogEle?.showModal();
};
