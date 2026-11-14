import { getDataset } from "./dataService.js";

export function getAccounts({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  customerId = "",
}) {
  let accounts = getDataset("accounts");

  if (search) {
    const term = search.toLowerCase();

    accounts = accounts.filter((account) =>
      [account.accountId, account.customerId, account.accountType]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }

  if (status) {
    accounts = accounts.filter((account) => account.status === status);
  }

  if (customerId) {
    accounts = accounts.filter((account) => account.customerId === customerId);
  }

  const total = accounts.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;

  return {
    accounts: accounts.slice(startIndex, startIndex + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export function getAccountById(accountId) {
  return getDataset("accounts").find(
    (account) => account.accountId === accountId,
  );
}
