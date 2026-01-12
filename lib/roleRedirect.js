export function roleRedirect(role) {
    switch (role) {
      case "admin":
        return "/admin/users";
      case "ops":
        return "/ops/orders";
      case "finance":
        return "/finance/invoices";
      case "buyer":
        return "/buyer/orders";
      default:
        return "/login";
    }
  }
  