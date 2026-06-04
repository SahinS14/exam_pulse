import apiClient from "./client";

export const createOrder = async () => {
  const response = await apiClient.post("/payment/create-order");
  return response.data;
};

export const verifyPayment = async (payload) => {
  const response = await apiClient.post("/payment/verify", payload);
  return response.data;
};
