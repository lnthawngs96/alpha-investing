import type { AgentLogEntry } from '@/types';

/**
 * Nhật ký hành động của agent.
 *
 * Lý do tồn tại: khi agent thao tác, người dùng phải NHÌN THẤY nó làm gì, nếu
 * không danh mục tự đổi mà không rõ nguyên nhân. Đây là store ngoài React
 * (không phải context) để lớp WebMCP ghi log được từ bất kỳ đâu, kể cả trong
 * execute() chạy ngoài chu kỳ render. Component đọc qua useSyncExternalStore.
 */

/** Số dòng log giữ lại (mới nhất ở đầu). */
const AGENT_LOG_LIMIT = 40;

let entries: AgentLogEntry[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((fn) => fn());
}

export interface LogAgentActionInput {
  tool: string;
  summary: string;
  ok?: boolean;
}

/** Thêm một dòng vào đầu nhật ký. */
export function logAgentAction({ tool, summary, ok = true }: LogAgentActionInput): void {
  entries = [
    {
      id: `${Date.now()}#${Math.random().toString(36).slice(2, 7)}`,
      at: new Date(),
      tool,
      summary,
      ok,
    },
    ...entries,
  ].slice(0, AGENT_LOG_LIMIT);
  emit();
}

export function clearAgentLog(): void {
  entries = [];
  emit();
}

export function subscribeAgentLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * useSyncExternalStore yêu cầu getSnapshot trả về tham chiếu ổn định giữa các
 * lần gọi khi dữ liệu không đổi — trả mảng mới mỗi lần sẽ gây loop vô hạn.
 */
export function getAgentLogSnapshot(): AgentLogEntry[] {
  return entries;
}
