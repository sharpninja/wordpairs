import { expect, it } from "vitest";
import {
  allowed,
  configuredAdministrator,
  permissions,
} from "../../src/domain/access";
import type { Actor } from "../../src/domain/model";

it("defaults to player authority and grants only explicit role permissions", () => {
  const player: Actor = { profileId: "player", roles: ["player"] };
  expect(permissions(player)).toEqual([]);
  expect(allowed({ ...player, roles: ["moderator"] }, "manage-content")).toBe(
    true,
  );
  expect(allowed({ ...player, roles: ["moderator"] }, "manage-users")).toBe(
    false,
  );
  expect(allowed({ ...player, roles: ["moderator"] }, "resolve-appeals")).toBe(
    false,
  );
  expect(
    allowed({ ...player, roles: ["senior-moderator"] }, "resolve-appeals"),
  ).toBe(true);
  expect(permissions({ ...player, roles: ["admin"] })).toEqual([
    "moderate",
    "manage-content",
    "resolve-appeals",
    "manage-users",
  ]);
});

it("matches configured administrators by exact authenticated ID without changing other actors", () => {
  const actor: Actor = { profileId: "owner-id", roles: ["player"] };
  expect(configuredAdministrator(actor, [])).toEqual(actor);
  expect(configuredAdministrator(actor, ["owner"])).toEqual(actor);
  const administrator = configuredAdministrator(actor, ["owner-id"]);
  expect(administrator.roles).toEqual(["player", "admin"]);
  expect(configuredAdministrator(administrator, ["owner-id"])).toEqual(
    administrator,
  );
  expect(actor.roles).toEqual(["player"]);
});
