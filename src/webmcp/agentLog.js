// Nhật ký hành động của agent.
//
// Lý do tồn tại: khi agent thao tác, người dùng phải NHÌN THẤY nó làm gì, nếu
// không danh mục tự đổi mà không rõ nguyên nhân. Đây là store ngoài React
// (không phải context) để lớp WebMCP ghi log được từ bất kỳ đâu, kể cả trong
// execute() chạy ngoài chu kỳ render.

const LIMIT = 40;

let entries = [];
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function logAgentAction({ tool, summary, ok = true }) {
  entries = [
    { id: `${Date.now()}#${Math.random().toString(36).slice(2, 7)}`, at: new Date(), tool, summary, ok },
    ...entries,
  ].slice(0, LIMIT);
  emit();
}

export function clearAgentLog() {
  entries = [];
  emit();
}

export function subscribeAgentLog(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// useSyncExternalStore yêu cầu getSnapshot trả về tham chiếu ổn định giữa các
// lần gọi khi dữ liệu không đổi — trả mảng mới mỗi lần sẽ gây loop vô hạn.
export function getAgentLogSnapshot() {
  return entries;
}
