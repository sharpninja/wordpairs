import { oidcAvailable } from "../../infrastructure/runtime";
import { ContentScreen } from "../../web/content-panel";
export const dynamic = "force-dynamic";
export default function AdministrationPage() {
  return <ContentScreen oidcEnabled={oidcAvailable()} administration />;
}
