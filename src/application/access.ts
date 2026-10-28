import { MANAGED_ROLES, type ManagedRole } from "../domain/access";
import { cleanText } from "../domain/content";
import type { Role } from "../domain/model";
import { failure, type Result } from "../domain/result";
import type { Command } from "./ports";

export interface RoleChange {
  profileId: string;
  role: ManagedRole;
  grant: boolean;
  reason: string;
}
export interface AccessView {
  actorId: string;
  version: number;
  total: number;
  users: {
    id: string;
    alias: string;
    kind: string;
    configuredAdmin: boolean;
    roles: Role[];
  }[];
  audit: {
    id: string;
    actorId: string;
    profileId: string;
    role: ManagedRole;
    granted: boolean;
    reason: string;
    at: number;
  }[];
}
export interface AccessPort {
  read(actorId: string, search: string): Promise<Result<AccessView>>;
  change(
    command: Command,
    input: RoleChange,
  ): Promise<Result<{ version: number }>>;
}
export class AccessService {
  constructor(private repository: AccessPort) {}
  view(actorId: string, search = "") {
    return search.length > 80
      ? Promise.resolve(failure("VALIDATION_ERROR"))
      : this.repository.read(actorId, search);
  }
  act(command: Command, input: RoleChange) {
    if (
      command.aggregateId !== "access-control" ||
      !MANAGED_ROLES.includes(input.role) ||
      typeof input.grant !== "boolean" ||
      !cleanText(input.profileId, 128) ||
      !cleanText(input.reason, 1000)
    )
      return Promise.resolve(failure("VALIDATION_ERROR"));
    return this.repository.change(command, input);
  }
}
