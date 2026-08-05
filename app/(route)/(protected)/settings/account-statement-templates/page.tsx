import { getAccountStatementTemplatesAction } from "@/actions/account-statement-template.action";
import { requirePermission } from "@/lib/requirePermission";
import AccountStatementTemplateManagement from "./components/AccountStatementTemplateManagement";

export default async function AccountStatementTemplatesPage() {
  await requirePermission("view_account_statement_templates");

  const result: any = await getAccountStatementTemplatesAction(1);
  const templates = Array.isArray(result?.data) ? result.data : [];

  return (
    <AccountStatementTemplateManagement
      initialTemplates={templates}
      initialMeta={result?.meta ?? null}
    />
  );
}
