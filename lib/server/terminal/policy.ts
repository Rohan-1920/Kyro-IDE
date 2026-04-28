export type CommandPolicyResult =
  | { allowed: true }
  | { allowed: false; reason: string };

const blockedPatterns = [
  /rm\s+-rf/i,
  /shutdown/i,
  /format\s+[a-z]:/i,
  /del\s+\/f\s+\/s\s+\/q/i
];

export function evaluateTerminalCommand(command: string): CommandPolicyResult {
  const normalized = command.trim();
  if (!normalized) return { allowed: false, reason: "Empty command is not allowed." };
  for (const pattern of blockedPatterns) {
    if (pattern.test(normalized)) {
      return { allowed: false, reason: "Command blocked by safe command policy." };
    }
  }
  return { allowed: true };
}
