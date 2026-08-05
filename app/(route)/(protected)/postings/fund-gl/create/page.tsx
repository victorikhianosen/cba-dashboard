import { requirePermission } from "@/lib/requirePermission";
import CreateFundGlPage from "./components/CreateFundGlPage";

export default async function FundGlCreatePage() {
  await requirePermission("create_fund_gls");

  return <CreateFundGlPage />;
}
