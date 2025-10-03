// Subject to change
export type PaymentMethod = "GCASH" | "PAYMAYA" | "CREDIT_CARD" | "DEBIT_CARD";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED";

export interface PaymentDetails {
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
}
