import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage } from '@/types/message';

// ページリロード中かどうかを判定するフラグ
let isPageReloading = false;

/**
 * WebSocket 接続を管理するカスタムフック。
 *
 * 指定されたチャンネルに対する WebSocket 接続を確立し、リアルタイムメッセージを受信します。
 * 自動再接続（指数バックオフ）、キープアライブ（ping/pong）、ページリロード検知を提供します。
 *
 * @param channel - WebSocket チャンネル名（'dashboard' | 'tasks'）
 * @returns lastMessage - 最後に受信したメッセージ
 * @returns connectionStatus - 接続状態（'connecting' | 'open' | 'closed'）
 * @returns sendMessage - メッセージ送信関数
 *
*/
export function useWebSocket(channel: string) {
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualCloseRef = useRef(false);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${channel}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('open');
      reconnectAttemptsRef.current = 0;
      console.log(`[WebSocket] 接続成功: ${channel}`);
    };

    ws.onclose = (event) => {
      setConnectionStatus('closed');

      // ページリロード時や手動切断時は再接続しない
      if (isPageReloading || isManualCloseRef.current) {
        console.log(`[WebSocket] 切断（再接続不要）: ${channel}`);
        return;
      }

      console.log(`[WebSocket] 切断 - コード: ${event.code}, 理由: ${event.reason || '不明'}`);

      // Exponential backoff reconnection
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;
      console.log(`[WebSocket] ${delay}ms後に再接続を試行（試行回数: ${reconnectAttemptsRef.current}）`);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        setLastMessage(data);
      } catch (e) {
        console.error('[WebSocket] メッセージのパースに失敗:', e);
      }
    };

    ws.onerror = (error) => {
      // ページリロード時や手動切断時はエラーログを抑制
      if (isPageReloading || isManualCloseRef.current) {
        return;
      }

      // 接続確立前や切断後のエラーは無視（自動再接続で回復する）
      if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
        return;
      }

      // エラーオブジェクトの詳細情報を抽出
      const errorDetails = {
        type: error.type,
        timestamp: new Date().toISOString(),
        readyState: ws.readyState,
        readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][ws.readyState] || 'UNKNOWN',
        url: wsUrl,
      };
      console.error('[WebSocket] エラー発生:', errorDetails);
    };
  }, [channel]);

  useEffect(() => {
    // ページリロード検知のためのイベントリスナー
    const handleBeforeUnload = () => {
      isPageReloading = true;
      isManualCloseRef.current = true;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    connect();

    // Send periodic ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      isManualCloseRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      clearInterval(pingInterval);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { lastMessage, connectionStatus, sendMessage };
}
