import { getAllCurrenciesAction } from "@/actions/currency.action";
import { getAllGeneralLedgersAction } from "@/actions/general-ledger.action";
import { getLoanProductsAction } from "@/actions/loan-product.action";
import { requirePermission } from "@/lib/requirePermission";
import LoanProductManagement from "./components/LoanProductManagement";

export default async function LoanProductPage() {
  await requirePermission("view_loan_products");

  const [productsResult, currenciesResult, ledgersResult]: any[] = await Promise.all([
    getLoanProductsAction(1),
    getAllCurrenciesAction(),
    getAllGeneralLedgersAction(),
  ]);

  const loanProducts = Array.isArray(productsResult?.data) ? productsResult.data : [];
  const currencies = Array.isArray(currenciesResult?.data) ? currenciesResult.data : [];
  const generalLedgers = Array.isArray(ledgersResult?.data) ? ledgersResult.data : [];

  return (
    <LoanProductManagement
      initialLoanProducts={loanProducts}
      initialMeta={productsResult?.meta ?? null}
      currencies={currencies}
      generalLedgers={generalLedgers}
    />
  );
}
