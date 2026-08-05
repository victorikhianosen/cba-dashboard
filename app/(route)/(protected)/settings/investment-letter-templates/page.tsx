import { getInvestmentLetterTemplatesAction } from "@/actions/investment-letter-template.action";
import { requirePermission } from "@/lib/requirePermission";
import InvestmentLetterTemplateManagement from "./components/InvestmentLetterTemplateManagement";

export default async function InvestmentLetterTemplatesPage() {
  await requirePermission("view_investment_letter_templates");

  const result: any = await getInvestmentLetterTemplatesAction(1);
  const templates = Array.isArray(result?.data) ? result.data : [];

  return (
    <InvestmentLetterTemplateManagement
      initialTemplates={templates}
      initialMeta={result?.meta ?? null}
    />
  );
}
