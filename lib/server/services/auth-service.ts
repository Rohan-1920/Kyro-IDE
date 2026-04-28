import { getRepository } from "@/lib/server/db/provider";
import { hashPassword, verifyPassword } from "@/lib/server/utils/auth";
import { ValidationError } from "@/lib/server/utils/validation";

export async function signup(input: { email: string; name: string; password: string }) {
  const repo = await getRepository();
  const existing = await repo.findUserByEmail(input.email);
  if (existing) throw new ValidationError("Email already registered.");
  const user = await repo.createUser({
    email: input.email.toLowerCase(),
    name: input.name,
    passwordHash: hashPassword(input.password)
  });
  return user;
}

export async function login(input: { email: string; password: string }) {
  const repo = await getRepository();
  const user = await repo.findUserByEmail(input.email.toLowerCase());
  if (!user) throw new ValidationError("Invalid email or password.");
  if (!verifyPassword(input.password, user.passwordHash)) {
    throw new ValidationError("Invalid email or password.");
  }
  return user;
}

export async function getUserById(userId: string) {
  const repo = await getRepository();
  return repo.findUserById(userId);
}
