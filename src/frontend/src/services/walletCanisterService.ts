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
    console.log("🚀 [walletCanisterService] getBalanceOf called with:", {
      userId,
    });
    try {
      const getBalanceFn = httpsCallable(functions, "getBalance");

      const result = await getBalanceFn({
        data: { userId },
      });

      console.log("✅ [walletCanisterService] getBalance raw result:", result);
      const responseData = result.data as {
        success: boolean;
        balance: number;
        heldBalance?: number;
        availableBalance?: number;
      };
      console.log(
        "✅ [walletCanisterService] getBalance extracted data:",
        responseData,
      );
      return responseData.balance || 0;
    } catch (error) {
      console.error(
        "❌ [walletCanisterService] Error fetching balance:",
        error,
      );
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
    console.log("🚀 [walletCanisterService] getWalletDetails called with:", {
      userId,
    });
    try {
      const getBalanceFn = httpsCallable(functions, "getBalance");

      const result = await getBalanceFn({
        data: { userId },
      });

      console.log(
        "✅ [walletCanisterService] getWalletDetails raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        balance: number;
        heldBalance: number;
        availableBalance: number;
      };
      console.log(
        "✅ [walletCanisterService] getWalletDetails extracted data:",
        responseData,
      );

      return {
        balance: responseData.balance || 0,
        heldBalance: responseData.heldBalance || 0,
        availableBalance: responseData.availableBalance || 0,
      };
    } catch (error) {
      console.error(
        "❌ [walletCanisterService] Error fetching wallet details:",
        error,
      );
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
    console.log("🚀 [walletCanisterService] transfer called with:", {
      fromUserId,
      toUserId,
      amount,
    });
    try {
      const transferFundsFn = httpsCallable(functions, "transferFunds");

      const result = await transferFundsFn({
        data: { fromUserId, toUserId, amount },
      });

      console.log(
        "✅ [walletCanisterService] transferFunds raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        transactionId: string;
      };
      console.log(
        "✅ [walletCanisterService] transferFunds extracted data:",
        responseData,
      );
      return responseData.transactionId;
    } catch (error) {
      console.error(
        "❌ [walletCanisterService] Error transferring funds:",
        error,
      );
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
    console.log("🚀 [walletCanisterService] creditWallet called with:", {
      userId,
      amount,
      paymentChannel,
      description,
    });
    try {
      const creditBalanceFn = httpsCallable(functions, "creditBalance");

      const result = await creditBalanceFn({
        data: { userId, amount, paymentChannel, description },
      });

      console.log(
        "✅ [walletCanisterService] creditBalance raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        newBalance: number;
      };
      console.log(
        "✅ [walletCanisterService] creditBalance extracted data:",
        responseData,
      );
      return responseData.newBalance;
    } catch (error) {
      console.error(
        "❌ [walletCanisterService] Error crediting wallet:",
        error,
      );
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
    console.log("🚀 [walletCanisterService] debitWallet called with:", {
      userId,
      amount,
      description,
      paymentChannel,
    });
    try {
      const debitBalanceFn = httpsCallable(functions, "debitBalance");

      const result = await debitBalanceFn({
        data: { userId, amount, description, paymentChannel },
      });

      console.log(
        "✅ [walletCanisterService] debitBalance raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        newBalance: number;
      };
      console.log(
        "✅ [walletCanisterService] debitBalance extracted data:",
        responseData,
      );
      return responseData.newBalance;
    } catch (error) {
      console.error("❌ [walletCanisterService] Error debiting wallet:", error);
      throw new Error(`Failed to debit wallet: ${error}`);
    }
  },

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string): Promise<Transaction[]> {
    console.log(
      "🚀 [walletCanisterService] getTransactionHistory called with:",
      {
        userId,
      },
    );
    try {
      const getTransactionHistoryFn = httpsCallable(
        functions,
        "getTransactionHistory",
      );

      const result = await getTransactionHistoryFn({
        data: { userId },
      });

      console.log(
        "✅ [walletCanisterService] getTransactionHistory raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        transactions: Transaction[];
      };
      console.log(
        "✅ [walletCanisterService] getTransactionHistory extracted data:",
        responseData,
      );
      return responseData.transactions || [];
    } catch (error) {
      console.error(
        "❌ [walletCanisterService] Error fetching transaction history:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Add authorized controller (Admin function)
   */
  async addAuthorizedController(userId: string): Promise<string> {
    console.log(
      "🚀 [walletCanisterService] addAuthorizedController called with:",
      {
        userId,
      },
    );
    try {
      const addAuthorizedControllerFn = httpsCallable(
        functions,
        "addAuthorizedController",
      );

      const result = await addAuthorizedControllerFn({
        data: { userId },
      });

      console.log(
        "✅ [walletCanisterService] addAuthorizedController raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; message: string };
      console.log(
        "✅ [walletCanisterService] addAuthorizedController extracted data:",
        responseData,
      );
      return responseData.message;
    } catch (error) {
      console.error(
        "❌ [walletCanisterService] Error adding authorized controller:",
        error,
      );
      throw new Error(`Failed to add authorized controller: ${error}`);
    }
  },

  /**
   * Remove authorized controller (Admin function)
   */
  async removeAuthorizedController(userId: string): Promise<string> {
    console.log(
      "🚀 [walletCanisterService] removeAuthorizedController called with:",
      {
        userId,
      },
    );
    try {
      const removeAuthorizedControllerFn = httpsCallable(
        functions,
        "removeAuthorizedController",
      );

      const result = await removeAuthorizedControllerFn({
        data: { userId },
      });

      console.log(
        "✅ [walletCanisterService] removeAuthorizedController raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; message: string };
      console.log(
        "✅ [walletCanisterService] removeAuthorizedController extracted data:",
        responseData,
      );
      return responseData.message;
    } catch (error) {
      console.error(
        "❌ [walletCanisterService] Error removing authorized controller:",
        error,
      );
      throw new Error(`Failed to remove authorized controller: ${error}`);
    }
  },

  /**
   * Get all authorized controllers (Admin function)
   */
  async getAuthorizedControllers(): Promise<any[]> {
    console.log("🚀 [walletCanisterService] getAuthorizedControllers called");
    try {
      const getAuthorizedControllersFn = httpsCallable(
        functions,
        "getAuthorizedControllers",
      );

      const result = await getAuthorizedControllersFn({});

      console.log(
        "✅ [walletCanisterService] getAuthorizedControllers raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        controllers: any[];
      };
      console.log(
        "✅ [walletCanisterService] getAuthorizedControllers extracted data:",
        responseData,
      );
      return responseData.controllers || [];
    } catch (error) {
      console.error(
        "❌ [walletCanisterService] Error fetching authorized controllers:",
        error,
      );
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
