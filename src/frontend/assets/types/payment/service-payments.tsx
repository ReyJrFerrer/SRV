import { PaymentDetails, PaymentStatus } from "./payment-details";

export interface ServicePayment extends PaymentDetails {
  advancePaymentPercentage: number;
  advancePayment: {
    status: PaymentStatus;
    transactionId?: string;
  };
  remainingPayment: {
    status: PaymentStatus;
    transactionId?: string;
  };
}
