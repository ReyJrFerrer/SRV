// Wallet Service (Firebase Cloud Functions)
import { Principal } from "@dfinity/principal";
import { httpsCallable } from "firebase/functions";
import { initializeFirebase } from "./firebaseApp";

// Initialize Firebase
const { functions } = initializeFirebase();

// Firebase authentication will be handled automatically by httpsCallable functions

// Type mappings for frontend compatibility
export type TransactionType = "Credit" | "Debit" | "Transfer";

export interface Transaction {
  id: string;
  from?: string;
  to?: string;
  amount: number;
  transaction_type: TransactionType;
  timestamp: string;
  description: string;
  payment_channel?: string;
  running_balance: number;
}

// Firebase wallet data is already in the correct format, no conversion needed

// Wallet Service Functions
export const walletCanisterService = {
  /**
   * Get balance for a specific user
   */
  async getBalanceOf(userId: string): Promise<number> {
    try {
      const getBalanceFn = httpsCallable(functions, "getBalance");

      const result = await getBalanceFn({
        data: { userId },
      });

      const responseData = result.data as {
        success: boolean;
        balance: number;
        heldBalance?: number;
        availableBalance?: number;
      };
      return responseData.balance || 0;
    } catch (error) {
      throw new Error(`Failed to fetch balance: ${error}`);
    }
  },

  /**
   * Get detailed wallet information including held balance
   */
  async getWalletDetails(userId: string): Promise<{
    balance: number;
    heldBalance: number;
    availableBalance: number;
  }> {
    try {
      const getBalanceFn = httpsCallable(functions, "getBalance");

      const result = await getBalanceFn({
        data: { userId },
      });
      const responseData = result.data as {
        success: boolean;
        balance: number;
        heldBalance: number;
        availableBalance: number;
      };

      return {
        balance: responseData.balance || 0,
        heldBalance: responseData.heldBalance || 0,
        availableBalance: responseData.availableBalance || 0,
      };
    } catch (error: any) {
      // Silently handle authentication errors (expected when user is not logged in)
      if (
        error?.code === "functions/unauthenticated" ||
        error?.message?.includes("401")
      ) {
        return {
          balance: 0,
          heldBalance: 0,
          availableBalance: 0,
        };
      }
      throw new Error(`Failed to fetch wallet details: ${error}`);
    }
  },

  /**
   * Transfer funds to another user
   */
  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
  ): Promise<string | null> {
    try {
      const transferFundsFn = httpsCallable(functions, "transferFunds");

      const result = await transferFundsFn({
        data: { fromUserId, toUserId, amount },
      });

      const responseData = result.data as {
        success: boolean;
        transactionId: string;
      };
      return responseData.transactionId;
    } catch (error) {
      throw new Error(`Failed to transfer funds: ${error}`);
    }
  },

  /**
   * Credit (add funds to) a user's wallet
   * This function is typically called by authorized controllers (like admin functions)
   * to add funds to a user's wallet after external payments
   */
  async creditWallet(
    userId: string,
    amount: number,
    paymentChannel?: string,
    description?: string,
  ): Promise<number> {
    try {
      const creditBalanceFn = httpsCallable(functions, "creditBalance");

      const result = await creditBalanceFn({
        data: { userId, amount, paymentChannel, description },
      });

      const responseData = result.data as {
        success: boolean;
        newBalance: number;
      };
      return responseData.newBalance;
    } catch (error) {
      throw new Error(`Failed to credit wallet: ${error}`);
    }
  },

  /**
   * Debit (remove funds from) a user's wallet
   * This function is typically called by authorized controllers for system operations
   */
  async debitWallet(
    userId: string,
    amount: number,
    description?: string,
    paymentChannel?: string,
  ): Promise<number> {
    try {
      const debitBalanceFn = httpsCallable(functions, "debitBalance");

      const result = await debitBalanceFn({
        data: { userId, amount, description, paymentChannel },
      });
      const responseData = result.data as {
        success: boolean;
        newBalance: number;
      };
      return responseData.newBalance;
    } catch (error) {
      throw new Error(`Failed to debit wallet: ${error}`);
    }
  },

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string): Promise<Transaction[]> {
    try {
      const getTransactionHistoryFn = httpsCallable(
        functions,
        "getTransactionHistory",
      );

      const result = await getTransactionHistoryFn({
        data: { userId },
      });

      const responseData = result.data as {
        success: boolean;
        transactions: Transaction[];
      };
      return responseData.transactions || [];
    } catch (error: any) {
      // Silently handle authentication errors (expected when user is not logged in)
      if (
        error?.code === "functions/unauthenticated" ||
        error?.message?.includes("401")
      ) {
        return [];
      }
      // Return empty array on other errors to prevent .map() issues
      return [];
    }
  },

  /**
   * Add authorized controller (Admin function)
   */
  async addAuthorizedController(userId: string): Promise<string> {
    try {
      const addAuthorizedControllerFn = httpsCallable(
        functions,
        "addAuthorizedController",
      );

      const result = await addAuthorizedControllerFn({
        data: { userId },
      });

      const responseData = result.data as { success: boolean; message: string };
      return responseData.message;
    } catch (error) {
      throw new Error(`Failed to add authorized controller: ${error}`);
    }
  },

  /**
   * Remove authorized controller (Admin function)
   */
  async removeAuthorizedController(userId: string): Promise<string> {
    try {
      const removeAuthorizedControllerFn = httpsCallable(
        functions,
        "removeAuthorizedController",
      );

      const result = await removeAuthorizedControllerFn({
        data: { userId },
      });

      const responseData = result.data as { success: boolean; message: string };
      return responseData.message;
    } catch (error) {
      throw new Error(`Failed to remove authorized controller: ${error}`);
    }
  },

  /**
   * Get all authorized controllers (Admin function)
   */
  async getAuthorizedControllers(): Promise<any[]> {
    try {
      const getAuthorizedControllersFn = httpsCallable(
        functions,
        "getAuthorizedControllers",
      );

      const result = await getAuthorizedControllersFn({});
      const responseData = result.data as {
        success: boolean;
        controllers: any[];
      };
      return responseData.controllers || [];
    } catch (error) {
      return []; // Return empty array on error
    }
  },

  /**
   * Get balance for a specific principal (legacy compatibility)
   * @deprecated Use getBalanceOf with userId string instead
   */
  async getBalanceOfPrincipal(principal: Principal): Promise<number> {
    return this.getBalanceOf(principal.toString());
  },

  /**
   * Get transaction history for a specific principal (legacy compatibility)
   * @deprecated Use getTransactionHistory with userId string instead
   */
  async getTransactionHistoryOf(principal: Principal): Promise<Transaction[]> {
    return this.getTransactionHistory(principal.toString());
  },
};

// Firebase functions don't require actor management or reset functionality

export default walletCanisterService;
