import { useEffect, useRef } from 'react';
import { logAgentAction } from './agentLog';

// ============================================================================
// Lớp nền WebMCP.
//
// WebMCP còn là chuẩn thử nghiệm nên bề mặt API vẫn đang đổi:
//   - Bản spec 27/05/2026 dời getter từ Navigator sang Document.
//     Chromium 150 đánh dấu navigator.modelContext là deprecated (vẫn chạy, chỉ
//     cảnh báo console) → thử document trước, rồi mới fallback navigator.
//   - Cách gỡ tool khác nhau giữa các bản: unregisterTool(name), handle trả về
//     từ registerTool(), hoặc gọi lại provideContext() với danh sách mới.
// Toàn bộ khác biệt đó được nuốt ở file này để phần còn lại của app chỉ thấy
// một API duy nhất: useWebMCPTools([...]).
// ============================================================================

export function getModelContext() {
  if (typeof document === 'undefined') return null;
  return (
    (typeof document !== 'undefined' && document.modelContext) ||
    (typeof navigator !== 'undefined' && navigator.modelContext) ||
    null
  );
}

export function isWebMCPAvailable() {
  const mc = getModelContext();
  return Boolean(mc && (mc.registerTool || mc.provideContext));
}

// Giữ giá trị mới nhất trong ref để closure của execute() không bắt state cũ.
// Đây là điểm chết người khi gắn tool vào React: tool đăng ký một lần lúc mount,
// nhưng execute có thể chạy nhiều phút sau đó và phải thấy state hiện tại.
export function useLatest(value) {
  const ref = useRef(value);
  // Ghi trong effect, không ghi khi render (quy tắc react-hooks/refs). Tool luôn
  // chạy từ sự kiện của trình duyệt, tức sau khi commit xong, nên ref chắc chắn
  // đã có giá trị mới nhất tại thời điểm execute() được gọi.
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

// Chuẩn hoá giá trị trả về của tool về đúng shape MCP content block.
// Trả về object/array → JSON để agent parse được; trả về string → text thô.
export function toToolResult(value, isError = false) {
  const text =
    typeof value === 'string' ? value : JSON.stringify(value ?? { ok: true }, null, 2);
  const result = { content: [{ type: 'text', text }] };
  if (isError) result.isError = true;
  return result;
}

function registerOne(mc, tool) {
  if (typeof mc.registerTool === 'function') {
    // Một số bản trả về handle có .unregister()/.remove()
    const handle = mc.registerTool(tool);
    return () => {
      try {
        if (handle && typeof handle.unregister === 'function') handle.unregister();
        else if (handle && typeof handle.remove === 'function') handle.remove();
        else if (typeof mc.unregisterTool === 'function') mc.unregisterTool(tool.name);
      } catch {
        /* gỡ tool thất bại không được làm hỏng unmount */
      }
    };
  }
  if (typeof mc.provideContext === 'function') {
    // API cũ: khai báo cả bộ. Không gỡ được từng cái → no-op khi cleanup.
    mc.provideContext({ tools: [tool] });
    return () => {};
  }
  return () => {};
}

/**
 * Đăng ký một bộ tool WebMCP theo vòng đời component.
 *
 * specs: [{ name, description, inputSchema, execute(args) }]
 *   - execute có thể async, trả về object thường (không cần tự bọc content block).
 *   - execute ném lỗi → tự động thành tool result có isError, agent đọc được
 *     thông báo và thử lại thay vì treo.
 *   - Trường `log` (tuỳ chọn) trong giá trị trả về là dòng hiển thị cho người
 *     dùng ở bảng Agent Activity.
 *
 * Tool chỉ đăng ký lại khi DANH SÁCH TÊN đổi, không phải mỗi lần render — nếu
 * không mỗi keystroke sẽ gỡ và đăng ký lại toàn bộ tool, và agent có thể gọi
 * đúng vào khoảnh khắc tool chưa tồn tại.
 */
export function useWebMCPTools(specs) {
  const specsRef = useRef(specs);
  useEffect(() => {
    specsRef.current = specs;
  });

  const signature = specs.map((s) => s.name).join('|');

  useEffect(() => {
    const mc = getModelContext();
    if (!mc) return undefined;

    const cleanups = [];

    for (const spec of specsRef.current) {
      const tool = {
        name: spec.name,
        description: spec.description,
        inputSchema: spec.inputSchema,
        ...(spec.annotations ? { annotations: spec.annotations } : {}),
        execute: async (args) => {
          // Luôn lấy bản execute mới nhất theo tên, không dùng closure lúc đăng ký.
          const live = specsRef.current.find((s) => s.name === spec.name) || spec;
          try {
            const out = await live.execute(args || {});
            logAgentAction({
              tool: spec.name,
              summary: (out && out.log) || spec.name,
              ok: true,
            });
            const payload = { ...(out || {}) };
            delete payload.log;
            return toToolResult(payload);
          } catch (err) {
            const message = (err && err.message) || String(err);
            logAgentAction({ tool: spec.name, summary: message, ok: false });
            return toToolResult({ error: message }, true);
          }
        },
      };
      try {
        cleanups.push(registerOne(mc, tool));
      } catch {
        /* một tool hỏng không được chặn các tool còn lại */
      }
    }

    return () => cleanups.forEach((fn) => fn());
  }, [signature]);
}
