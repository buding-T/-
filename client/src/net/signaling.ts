// 信令通道封装：房间匹配与 WebRTC SDP/ICE 中转（可靠 WebSocket）
import type {
  SignalClientMessage,
  SignalServerMessage,
} from './protocol';

type Handler = (msg: SignalServerMessage) => void;

export class Signaling {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      const timer = window.setTimeout(() => {
        ws.close();
        reject(new Error('连接信令服务器超时，请确认服务器已启动'));
      }, 8000);

      ws.onopen = () => {
        window.clearTimeout(timer);
        resolve();
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as SignalServerMessage;
          this.handlers.forEach((h) => h(msg));
        } catch {
          // 忽略无法解析的消息
        }
      };
      ws.onerror = () => {
        if (ws.readyState !== WebSocket.OPEN) {
          window.clearTimeout(timer);
          reject(new Error('无法连接信令服务器'));
        }
      };
    });
  }

  send(msg: SignalClientMessage) {
    if (this.connected) this.ws!.send(JSON.stringify(msg));
  }

  on(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  close() {
    this.ws?.close();
    this.ws = null;
    this.handlers.clear();
  }
}

export function defaultSignalUrl(): string {
  const override = new URLSearchParams(window.location.search).get('srv');
  if (override) return override;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.hostname}:8080/ws`;
}
