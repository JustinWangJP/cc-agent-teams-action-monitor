/**
 * 日付フォーマット用オプション
 */
interface DateFormatOptions {
  locale?: string;
  includeTime?: boolean;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
}

/**
 * 日付をロケールに対応した文字列にフォーマットします
 *
 * @param date - フォーマットする日付（Date オブジェクトまたは ISO 文字列）
 * @param locale - ロケールコード（例: 'ja', 'en', 'zh'）
 * @param options - フォーマットオプション
 * @returns フォーマットされた日付文字列
 */
export function formatDate(
  date: Date | string,
  locale: string,
  options: DateFormatOptions = {}
): string {
  const {
    includeTime = true,
    dateStyle = 'medium',
    timeStyle = 'short',
  } = options;

  const d = typeof date === 'string' ? new Date(date) : date;

  // 無効な日付の場合
  if (isNaN(d.getTime())) {
    return '';
  }

  try {
    if (includeTime) {
      return new Intl.DateTimeFormat(locale, {
        dateStyle,
        timeStyle,
      }).format(d);
    } else {
      return new Intl.DateTimeFormat(locale, {
        dateStyle,
      }).format(d);
    }
  } catch (error) {
    console.error('Date formatting error:', error);
    return d.toLocaleString();
  }
}

/**
 * 相対時間をフォーマットします（例: "5分前"）
 *
 * @param date - 基準となる日付
 * @param locale - ロケールコード
 * @returns 相対時間文字列
 */
export function formatRelativeTime(date: Date | string, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffSeconds < 60) {
      return rtf.format(-diffSeconds, 'second');
    } else if (diffMinutes < 60) {
      return rtf.format(-diffMinutes, 'minute');
    } else if (diffHours < 24) {
      return rtf.format(-diffHours, 'hour');
    } else {
      return rtf.format(-diffDays, 'day');
    }
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return formatDate(d, locale);
  }
}

/**
 * 時間の長さをフォーマットします（例: "1時間30分"）
 *
 * @param seconds - 秒数
 * @param locale - ロケールコード
 * @returns フォーマットされた時間文字列
 */
export function formatDuration(seconds: number, locale: string): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(
      new Intl.NumberFormat(locale, { style: 'unit', unit: 'hour', unitDisplay: 'long' }).format(hours)
    );
  }
  if (minutes > 0) {
    parts.push(
      new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay: 'long' }).format(minutes)
    );
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(
      new Intl.NumberFormat(locale, { style: 'unit', unit: 'second', unitDisplay: 'long' }).format(secs)
    );
  }

  return locale === 'ja' ? parts.join('') : parts.join(' ');
}

/**
 * タイムスタンプを ISO 8601 形式の文字列に変換します
 *
 * @param date - 変換する日付
 * @returns ISO 8601 形式の文字列
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * ISO 8601 形式の文字列を Date オブジェクトに変換します
 *
 * @param isoString - ISO 8601 形式の文字列
 * @returns Date オブジェクト
 */
export function fromISOString(isoString: string): Date {
  return new Date(isoString);
}
