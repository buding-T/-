/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 信令服务器 WebSocket 地址（生产构建时注入） */
  readonly VITE_SIGNAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
