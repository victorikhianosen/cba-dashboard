import { getAccountProductsAction } from "@/actions/account-product.action";
import { getAllCurrenciesAction } from "@/actions/currency.action";
import { getAllGeneralLedgersAction } from "@/actions/general-ledger.action";
import { requirePermission } from "@/lib/requirePermission";
import AccountProductManagement from "./components/AccountProductManagement";

export default async function AccountProductPage() {
  await requirePermission("view_account_products");

  const [productsResult, currenciesResult, ledgersResult]: any[] = await Promise.all([
    getAccountProductsAction(1),
    getAllCurrenciesAction(),
    getAllGeneralLedgersAction(),
  ]);

  const accountProducts = Array.isArray(productsResult?.data) ? productsResult.data : [];
  const currencies = Array.isArray(currenciesResult?.data) ? currenciesResult.data : [];
  const generalLedgers = Array.isArray(ledgersResult?.data) ? ledgersResult.data : [];

  return (
    <AccountProductManagement
      initialAccountProducts={accountProducts}
      initialMeta={productsResult?.meta ?? null}
      currencies={currencies}
      generalLedgers={generalLedgers}
    />
  );
}
