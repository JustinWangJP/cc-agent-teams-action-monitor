import i18n from '@/i18n';

/**
 * APIリクエスト用の設定インターフェース
 */
interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

/**
 * APIエラーレスポンスの型
 */
interface ApiErrorResponse {
  detail: string;
  status?: number;
}

/**
 * APIリクエストを送信する汎用関数
 *
 * Accept-Language ヘッダーを自動的に付与し、
 * 現在のi18n言語設定をバックエンドに伝えます。
 *
 * @param url - APIエンドポイントのURL
 * @param options - fetch APIのオプション（headersはマージされます）
 * @returns レスポンスのJSONデータ
 * @throws ApiErrorResponse を含むエラー
 */
export async function apiFetch<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { headers = {}, ...restOptions } = options;

  // Accept-Language ヘッダーを追加
  const requestHeaders: Record<string, string> = {
    'Accept-Language': i18n.language,
    'Content-Type': 'application/json',
    ...headers,
  };

  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ detail: 'Unknown error' }))) as ApiErrorResponse;
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/**
 * GET リクエストを送信するユーティリティ関数
 *
 * @param url - APIエンドポイントのURL
 * @returns レスポンスのJSONデータ
 */
export async function apiGet<T>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'GET' });
}

/**
 * POST リクエストを送信するユーティリティ関数
 *
 * @param url - APIエンドポイントのURL
 * @param data - リクエストボディ
 * @returns レスポンスのJSONデータ
 */
export async function apiPost<T, D = unknown>(url: string, data?: D): Promise<T> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT リクエストを送信するユーティリティ関数
 *
 * @param url - APIエンドポイントのURL
 * @param data - リクエストボディ
 * @returns レスポンスのJSONデータ
 */
export async function apiPut<T, D = unknown>(url: string, data?: D): Promise<T> {
  return apiFetch<T>(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE リクエストを送信するユーティリティ関数
 *
 * @param url - APIエンドポイントのURL
 * @returns レスポンスのJSONデータ
 */
export async function apiDelete<T>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'DELETE' });
}
