import type { Actor, Role } from "./model";

export const MANAGED_ROLES = [
  "moderator",
  "senior-moderator",
  "admin",
] as const;
export type ManagedRole = (typeof MANAGED_ROLES)[number];
export type Permission =
  | "moderate"
  | "manage-content"
  | "resolve-appeals"
  | "manage-users";
const grants: Record<Role, readonly Permission[]> = {
  player: [],
  moderator: ["moderate", "manage-content"],
  "senior-moderator": ["moderate", "manage-content", "resolve-appeals"],
  admin: ["moderate", "manage-content", "resolve-appeals", "manage-users"],
};
export const permissions = (actor: Actor): Permission[] => [
  ...new Set(actor.roles.flatMap((role) => grants[role] ?? [])),
];
export const allowed = (actor: Actor, permission: Permission) =>
  permissions(actor).includes(permission);
export function configuredAdministrator(
  actor: Actor,
  profileIds: readonly string[],
): Actor {
  return profileIds.includes(actor.profileId)
    ? { ...actor, roles: [...new Set<Role>([...actor.roles, "admin"])] }
    : actor;
}
