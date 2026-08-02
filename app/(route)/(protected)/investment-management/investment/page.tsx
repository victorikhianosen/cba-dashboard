import { getAllInvestmentProductsAction } from "@/actions/investment-product.action";
import { requirePermission } from "@/lib/requirePermission";
import InvestmentManagement from "./components/InvestmentManagement";

export default async function InvestmentPage() {
  await requirePermission("view_investments");

  const productsResult: any = await getAllInvestmentProductsAction();
  const investmentProducts = Array.isArray(productsResult?.data) ? productsResult.data : [];

  return <InvestmentManagement investmentProducts={investmentProducts} />;
}
