import { failure, success } from "../domain/result";
import { getAdminIdentityService } from "../infrastructure/runtime";
import { cookie } from "./server-http";

/** Only the namespace issued by the verified sharpninja GitHub flow is accepted. */
export async function adminSession(request: Request) {
  const service = getAdminIdentityService();
  if (!service) return failure("NOT_AUTHENTICATED");
  const result = await service.session(cookie(request, "wp_admin"));
  if (!result.ok) return result;
  if (result.value.profile.kind !== "member") return failure("NOT_AUTHORIZED");
  return success({
    profile: result.value.profile,
    actor: { profileId: result.value.profile.id, roles: ["admin" as const] },
  });
}
