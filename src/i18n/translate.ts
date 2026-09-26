import type { Locale } from '@/types/locale';
import { en } from './messages/en';
import { vi, type MessageTree } from './messages/vi';

export type { MessageTree };

const catalogs: Record<Locale, MessageTree> = { vi, en };

type Primitive = string;

/** Lấy giá trị lá (string) theo đường dẫn kiểu `header.tagline`. */
type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

type Leaves<T, Prefix extends string = ''> = T extends Primitive
  ? Prefix
  : {
      [K in keyof T & string]: Leaves<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>;
    }[keyof T & string];

export type MessageKey = Leaves<MessageTree>;

function getByPath(tree: MessageTree, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = tree;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** Thay `{name}` trong chuỗi bằng biến. */
export function formatMessage(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : `{${key}}`
  );
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  const raw = getByPath(catalogs[locale], key) ?? getByPath(catalogs.vi, key) ?? key;
  return formatMessage(raw, vars);
}

export type { PathValue };
