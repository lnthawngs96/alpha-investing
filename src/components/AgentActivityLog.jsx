import { useSyncExternalStore, useState } from 'react';
import { subscribeAgentLog, getAgentLogSnapshot, clearAgentLog } from '../webmcp/agentLog';
import { isWebMCPAvailable } from '../webmcp/useWebMCP';

// Bảng theo dõi hành động của agent.
//
// Đây là nửa "con người" của bài toán human + agent: agent sửa danh mục qua
// tool, còn người dùng cần thấy nó vừa làm gì để can thiệp kịp. Không có bảng
// này thì trọng số tự nhảy mà không rõ lý do.
export default function AgentActivityLog() {
  const entries = useSyncExternalStore(subscribeAgentLog, getAgentLogSnapshot);
  const [collapsed, setCollapsed] = useState(false);
  const available = isWebMCPAvailable();

  if (collapsed) {
    return (
      <button
        className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg border border-violet-500/50 bg-slate-900 text-violet-400 font-mono text-xs font-bold tracking-wider cursor-pointer hover:bg-slate-800"
        onClick={() => setCollapsed(false)}
      >
        ◈ AGENT {entries.length > 0 && `(${entries.length})`}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-96 flex flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${available ? 'bg-emerald-400' : 'bg-slate-600'}`}
            title={available ? 'WebMCP đang hoạt động' : 'Trình duyệt chưa bật WebMCP'}
          />
          <span className="text-xs font-bold tracking-wider text-slate-400">AGENT ACTIVITY</span>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button
              className="bg-transparent border-none text-slate-500 hover:text-slate-300 cursor-pointer font-mono text-xs px-1"
              onClick={clearAgentLog}
              title="Xoá nhật ký"
            >
              ⌫
            </button>
          )}
          <button
            className="bg-transparent border-none text-slate-500 hover:text-slate-300 cursor-pointer font-mono text-xs px-1"
            onClick={() => setCollapsed(true)}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.length === 0 ? (
          <div className="px-4 py-6 text-xs text-slate-600 text-center leading-relaxed">
            {available
              ? 'Chưa có hành động nào.\nAgent có thể nạp dữ liệu, dựng danh mục và thoát dedupe qua WebMCP.'
              : 'Trình duyệt này chưa bật WebMCP.\nMở app trong ChatGPT desktop, hoặc Chrome với cờ enable-webmcp-testing.'}
          </div>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              className="px-4 py-2 border-b border-slate-800 last:border-b-0 flex gap-2 items-start"
            >
              <span className={`text-xs shrink-0 ${e.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {e.ok ? '▸' : '✕'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-300 break-words leading-relaxed">{e.summary}</div>
                <div className="text-xs text-slate-600 mt-1">
                  {e.tool} · {e.at.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
