import { getDataset } from "./dataService.js";

export function getCustomers({
  page = 1,
  limit = 10,
  search = "",
  kycStatus = "",
}) {
  let customers = getDataset("customers");

  if (search) {
    const term = search.toLowerCase();

    customers = customers.filter((customer) =>
      [
        customer.customerId,
        customer.firstName,
        customer.lastName,
        customer.email,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }

  if (kycStatus) {
    customers = customers.filter(
      (customer) => customer.kycStatus === kycStatus,
    );
  }

  const total = customers.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;

  return {
    customers: customers.slice(startIndex, startIndex + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export function getCustomerById(customerId) {
  return getDataset("customers").find(
    (customer) => customer.customerId === customerId,
  );
}
