export function getBuyerOrders(context) {
  // context = { userId, role, orgId }
  return [];
}

export async function createOrder(context, input) {
  // This is now handled by the API directly
  return { success: true };
}

export async function listOrders(context) {
  // This is now handled by the API directly
  return [];
}
