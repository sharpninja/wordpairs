import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
export const secrets = {
  token: () => randomBytes(32).toString("base64url"),
  hash: (value: string) => createHash("sha256").update(value).digest("hex"),
};
export const ids = { next: () => randomUUID() };
export const random = {
  integer: (minimum: number, maximum: number) =>
    randomInt(minimum, maximum + 1),
};
