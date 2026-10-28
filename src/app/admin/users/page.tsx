import { oidcAvailable } from "../../../infrastructure/runtime";
import { AdminScreen } from "../../../web/admin-panel";
export const dynamic = "force-dynamic";
export default function UsersPage() {
  return <AdminScreen page="users" oidcEnabled={oidcAvailable()} />;
}
