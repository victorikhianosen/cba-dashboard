import { getSettingsAction } from "@/actions/setting.action";
import { requirePermission } from "@/lib/requirePermission";
import SystemSettingsManagement from "./components/SystemSettingsManagement";

export default async function SystemSettingsPage() {
  await requirePermission("view_settings");

  const result: any = await getSettingsAction();
  const settings = Array.isArray(result?.data) ? result.data : [];

  return <SystemSettingsManagement initialSettings={settings} />;
}
