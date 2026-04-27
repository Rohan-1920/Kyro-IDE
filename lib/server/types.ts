export type ApiSuccess<T> = {
  success: true;
  code: string;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
};

export type ApiError = {
  success: false;
  code: string;
  error: string;
  details?: unknown;
  meta?: {
    requestId: string;
    timestamp: string;
  };
};

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type ProjectRecord = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectFileRecord = {
  id: string;
  projectId: string;
  path: string;
  name: string;
  language: "typescript" | "javascript" | "css" | "json" | "markdown";
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageRecord = {
  id: string;
  projectId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type TerminalExecution = {
  id: string;
  projectId: string;
  command: string;
  output: string;
  status: "completed" | "failed";
  executedAt: string;
};
