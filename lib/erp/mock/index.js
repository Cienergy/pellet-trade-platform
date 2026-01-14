import * as mockOrders from "./orders";
import * as mockCreateOrder from "./createOrder";

export const ERP = {
  getBuyerOrders: mockOrders.getBuyerOrders,
  createBuyerOrder: mockCreateOrder.createBuyerOrder,
};

export { createOrder, listOrders } from "./orders";
