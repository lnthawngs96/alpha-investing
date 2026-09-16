/**
 * Kiểu cho lớp WebMCP (chuẩn thử nghiệm, API vẫn đang thay đổi).
 * Toàn bộ khác biệt giữa các bản spec được nuốt ở `webmcp/useWebMCP.ts`.
 */

/** JSON Schema tối giản cho inputSchema của tool. */
export interface ToolInputSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/** Kết quả thô mà `execute` của một tool trả về; trường `log` hiển thị ở bảng Agent Activity. */
export interface ToolOutput {
  log?: string;
  [key: string]: unknown;
}

/**
 * Khai báo một tool theo cách app dùng: `execute` nhận args thô, trả về
 * object thường (không phải MCP content block).
 */
export interface ToolSpec<Args = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  annotations?: { readOnlyHint?: boolean; [key: string]: unknown };
  execute: (args: Args) => Promise<ToolOutput> | ToolOutput;
}

/** MCP content block mà agent nhận được. */
export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/** Tool đã bọc — đây là shape thật đưa cho trình duyệt / window.__webmcpTools. */
export interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  annotations?: ToolSpec['annotations'];
  execute: (args?: Record<string, unknown>) => Promise<ToolResult>;
}

/** Handle mà một số bản registerTool() trả về. */
export interface ToolRegistrationHandle {
  unregister?: () => void;
  remove?: () => void;
}

/** Bề mặt `document.modelContext` / `navigator.modelContext`. */
export interface ModelContext {
  registerTool?: (tool: RegisteredTool) => ToolRegistrationHandle | void;
  unregisterTool?: (name: string) => void;
  provideContext?: (ctx: { tools: RegisteredTool[] }) => void;
}

/** Một dòng trong nhật ký hành động của agent. */
export interface AgentLogEntry {
  id: string;
  at: Date;
  tool: string;
  summary: string;
  ok: boolean;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
  interface Navigator {
    modelContext?: ModelContext;
  }
  interface Window {
    /** Cầu nối debug: gọi tool trực tiếp từ Console dù trình duyệt chưa hỗ trợ WebMCP. */
    __webmcpTools?: Record<string, RegisteredTool>;
  }
}
