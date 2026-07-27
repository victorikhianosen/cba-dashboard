// The customer show/create/update/approve/etc. endpoints all return a grouped
// shape: { customer: {...}, branch, account_officer, accounts, documents,
// address, address_history, next_of_kin, business, directors, signatories }.
// The customer-management UI expects one flat object, so this flattens the
// grouped API response back into the shape the components read.
export function flattenCustomer(data: Record<string, any>): Record<string, any> {
  const { preferences, verification, approval, ...core } = data.customer ?? {};

  return {
    ...core,
    ...preferences,
    ...verification,
    ...approval,
    branch: data.branch,
    account_officer: data.account_officer,
    accounts: data.accounts,
    documents: data.documents,
    address: data.address,
    address_history: data.address_history,
    next_of_kin: data.next_of_kin,
    business: data.business,
    directors: data.directors,
    signatories: data.signatories,
  };
}
