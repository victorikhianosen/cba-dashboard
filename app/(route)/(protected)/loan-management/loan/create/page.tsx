import { getAllLoanProductsAction } from "@/actions/loan-product.action";
import { requirePermission } from "@/lib/requirePermission";
import CreateLoanPage from "./components/CreateLoanPage";

export default async function LoanCreatePage() {
  await requirePermission("create_loans");

  const productsResult: any = await getAllLoanProductsAction();
  const loanProducts = Array.isArray(productsResult?.data) ? productsResult.data : [];

  return <CreateLoanPage loanProducts={loanProducts} />;
}
