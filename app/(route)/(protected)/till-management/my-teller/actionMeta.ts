import { ArrowDownCircle, ArrowUpCircle, HandCoins } from "lucide-react";

export type ActionKind = "deposit" | "withdraw" | "buy" | "sell";

export const ACTION_META: Record<
  ActionKind,
  { title: string; icon: typeof ArrowDownCircle; tone: "emerald" | "red"; needsAccount: boolean; helper: string; submitLabel: string; successMessage: string }
> = {
  deposit: {
    title: "Deposit for Customer",
    icon: HandCoins,
    tone: "emerald",
    needsAccount: true,
    helper: "Posts immediately — works for any account, including someone else's.",
    submitLabel: "Record Deposit",
    successMessage: "Deposit recorded.",
  },
  withdraw: {
    title: "Withdraw for Customer",
    icon: HandCoins,
    tone: "red",
    needsAccount: true,
    helper: "Requires a second admin's approval before cash is handed out.",
    submitLabel: "Request Withdrawal",
    successMessage: "Withdrawal requested — awaiting a second admin's approval before cash is handed out.",
  },
  buy: {
    title: "Cash Buy (from Vault)",
    icon: ArrowDownCircle,
    tone: "emerald",
    needsAccount: false,
    helper: "Draws cash into your till from the vault.",
    submitLabel: "Record Buy",
    successMessage: "Cash buy recorded.",
  },
  sell: {
    title: "Cash Sell (to Vault)",
    icon: ArrowUpCircle,
    tone: "red",
    needsAccount: false,
    helper: "Returns excess cash from your till to the vault.",
    submitLabel: "Record Sell",
    successMessage: "Cash sell recorded.",
  },
};
