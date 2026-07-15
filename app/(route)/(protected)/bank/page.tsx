import { getBanksAction } from "@/actions/bank.action";
import BankManagement from "./components/BankManagement";

export default async function BankPage() {
  const result: any = await getBanksAction(1);
  const banks = Array.isArray(result?.data) ? result.data : [];

  return (
    <BankManagement
      initialBanks={banks}
      initialMeta={result?.meta ?? null}
    />
  );
}
