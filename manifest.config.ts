import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json";
import type { ManifestV3Export } from "@crxjs/vite-plugin";

// 从 package.json 中获取版本信息
const { version } = packageJson;

// 获取构建目标环境（chrome/firefox）
const target = process.env.BUILD_TARGET;

// 将 Semver 版本号（例如：0.1.0-beta6）转换为 Chrome 扩展需要的格式
// 从版本号中提取主要版本号、次要版本号、修订号和标签
const [major, minor, patch, label = "0"] = version
  // 只保留数字、点号和短横线，移除其他字符
  .replace(/[^\d.-]+/g, "")
  // 按点号或短横线分割版本号
  .split(/[.-]/);

// 定义 Chrome 扩展的基本配置
let json: ManifestV3Export = {
  manifest_version: 3,  // 使用 Manifest V3 规范
  name: "lingo link",   // 扩展名称
  // 版本号：最多四个由点号分隔的数字
  version: `${major}.${minor}.${patch}.${label}`,
  // 版本名称：可以使用完整的 Semver 格式
  version_name: version,
  icons: {
    128: "src/assets/icon.png",  // 128x128 像素的图标
  },
  action: {
    default_icon: "src/assets/icon.png",  // 点击扩展图标时显示的图标
    default_popup: "src/pages/popup/index.html",  // 点击扩展图标时弹出的页面
  },
  permissions: [
    "activeTab",      // 获取当前活动标签页的权限
    "identity",       // 身份验证权限
    "storage",        // 存储权限，用于保存用户设置
    "contextMenus",   // 右键菜单权限
    "identity.email", // 获取用户邮箱的权限
  ],
  content_scripts: [
    {
      js: ["src/contentScript/index.tsx"],  // 注入到网页的脚本文件
      matches: ["*://*/*"],  // 匹配所有网址
    },
  ],
  options_page: "src/pages/options/index.html",  // 扩展选项页面
  background: {
    service_worker: "src/background.ts",  // 后台服务工作线程
    type: "module",  // 使用 ES6 模块
  },
  host_permissions: ["https://www.youdao.com/*", "https://dict.youdao.com/*"],  // 有权限访问的域名
  externally_connectable: {
    matches: ["http://localhost:7777/*", "https://*.mywords.cc/*"],  // 允许外部连接的域名
  },
};
// 如果构建目标是 Chrome，添加 Chrome 特定的配置
if (target === "chrome") {
  json = {
    ...json,
    ...{
      key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApXvVjpN4kxyWPCZuhsoHZYavMOI+U5w6FHXITdHUuF5UKzlAJr0Lqu5ZY5+b6U+Y19ZLh9SDfhFi4fk5PtF3I8cQbUI8p2eXxwUio7IgxWJQgruQLwILO08LvLTa55BinA/Sgstl6zbYTAeFLthd1JJyz5FDN26NwH6CcbqEY7AC2Vr9/VtwH4buz92qetjuR5MpfrzNUN0QtSlKnXPJ8wasCGeWDcerynYw/OEVXwbgiENfK8+K9hHKnsZLK+U4Y4yrNEZPOfMBSe+Q1o2+eof2DQFxsDxy9ohyk3P1/oyP3vmhD2xxuJOtsS9hp31lDm+2nlreCC3w5IKsUZABDQIDAQAB",  // Chrome 扩展的公钥
      oauth2: {
        client_id:
          "33611715893-c00c0ofv209ophmc2tf113t3t6luslkt.apps.googleusercontent.com",  // Google OAuth2 客户端 ID
        scopes: [
          "https://www.googleapis.com/auth/userinfo.profile",  // 获取用户个人资料信息
          "https://www.googleapis.com/auth/userinfo.email",    // 获取用户邮箱信息
        ],
      },
    },
  };
}
// 如果构建目标是 Firefox，添加 Firefox 特定的配置
if (target === "firefox") {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Firefox 使用不同的配置格式
  json = {
    ...json,
    ...{
      browser_specific_settings:{
        gecko: {
          id: "lingolink@gmail.com",  // Firefox 扩展的 ID
        }
      },
      background: {
        page: "background.html"  // Firefox 使用 background.html 而不是 service worker
      },
    }
  }
}

// 导出扩展配置，使用 defineManifest 函数处理异步配置
export default defineManifest(async () => json);
