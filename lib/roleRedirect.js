export function roleRedirect(role) {
    switch (role) {
      case "ADMIN":
        return "/admin/dashboard";
      case "OPS":
        return "/ops/dashboard";
      case "FINANCE":
        return "/finance/dashboard";
      case "BUYER":
        return "/buyer/dashboard";
      default:
        return "/login";
    }
  }
  