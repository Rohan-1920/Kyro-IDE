import { EventEmitter } from "events";
import type { TerminalExecution } from "@/lib/server/types";

declare global {
  // eslint-disable-next-line no-var
  var __terminalStreamBus: EventEmitter | undefined;
}

function getBus() {
  if (!globalThis.__terminalStreamBus) {
    globalThis.__terminalStreamBus = new EventEmitter();
    globalThis.__terminalStreamBus.setMaxListeners(1000);
  }
  return globalThis.__terminalStreamBus;
}

function channel(sessionId: string) {
  return `terminal:${sessionId}`;
}

export function publishTerminalEvent(sessionId: string, event: TerminalExecution) {
  getBus().emit(channel(sessionId), event);
}

export function subscribeTerminalEvents(
  sessionId: string,
  listener: (event: TerminalExecution) => void
) {
  const bus = getBus();
  const key = channel(sessionId);
  bus.on(key, listener);
  return () => bus.off(key, listener);
}
