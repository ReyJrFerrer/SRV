// Wallet Canister Service
import { Principal } from "@dfinity/principal";
import { createActor, canisterId } from "../../../declarations/wallet";
import { Identity } from "@dfinity/agent";
import type {
  _SERVICE as WalletService,
  Transaction as CanisterTransaction,
  TransactionType as CanisterTransactionType,
} from "../../../declarations/wallet/wallet.did";

/**
 * Creates a wallet actor with the provided identity
 * @param identity The user's identity from AuthContext
 * @returns An authenticated WalletService actor
 */
const createWalletActor = (identity?: Identity | null): WalletService => {
  return createActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host:
        process.env.DFX_NETWORK !== "ic" &&
        process.env.DFX_NETWORK !== "playground"
          ? "http://localhost:4943"
          : "https://ic0.app",
    },
  }) as WalletService;
};

// Singleton actor instance with identity tracking
let walletActor: WalletService | null = null;
let currentIdentity: Identity | null = null;

/**
 * Updates the wallet actor with a new identity
 * This should be called when the user's authentication state changes
 */
export const updateWalletActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    walletActor = createWalletActor(identity);
    currentIdentity = identity;
  }
};

/**
 * Gets the current wallet actor
 * Throws error if no authenticated identity is available for auth-required operations
 */
const getWalletActor = (requireAuth: boolean = false): WalletService => {
  if (requireAuth && !currentIdentity) {
    throw new Error(
      "Authentication required: Please log in to perform this action",
    );
  }

  if (!walletActor) {
    walletActor = createWalletActor(currentIdentity);
  }

  return walletActor;
};

// Type mappings for frontend compatibility
export type TransactionType = "Credit" | "Debit" | "Transfer";

export interface Transaction {
  id: string;
  from?: Principal;
  to?: Principal;
  amount: number;
  transactionType: TransactionType;
  timestamp: string;
  description: string;
  paymentChannel?: string;
  runningBalance: number;
}

// Helper functions to convert between canister and frontend types
const convertCanisterTransactionType = (
  type: CanisterTransactionType,
): TransactionType => {
  if ("Credit" in type) return "Credit";
  if ("Debit" in type) return "Debit";
  if ("Transfer" in type) return "Transfer";
  return "Credit"; // fallback
};

const convertCanisterTransaction = (
  transaction: CanisterTransaction,
): Transaction => ({
  id: transaction.id,
  from: transaction.from[0],
  to: transaction.to[0],
  amount: Number(transaction.amount),
  transactionType: convertCanisterTransactionType(transaction.transaction_type),
  timestamp: new Date(Number(transaction.timestamp) / 1000000).toISOString(),
  description: transaction.description,
  paymentChannel: (transaction as any).payment_channel?.[0] || undefined,
  runningBalance: Number((transaction as any).running_balance || 0),
});

// Wallet Canister Service Functions (Non-Admin Only)
export const walletCanisterService = {
  /**
   * Get balance for a specific principal
   */
  async getBalanceOf(principal: Principal): Promise<number> {
    try {
      const actor = getWalletActor();
      const balance = await actor.get_balance_of(principal);
      // Convert from centavos to pesos (divide by 100)
      return Number(balance) / 100;
    } catch (error) {
      //console.error("Error fetching balance for principal:", error);
      throw new Error(`Failed to fetch balance for principal: ${error}`);
    }
  },

  /**
   * Transfer funds to another user
   */
  async transfer(to: Principal, amount: number): Promise<string | null> {
    try {
      const actor = getWalletActor(true); // Requires authentication
      if (!currentIdentity) {
        throw new Error("No authenticated identity available");
      }

      const fromPrincipal = Principal.fromText(
        currentIdentity.getPrincipal().toString(),
      );
      const result = await actor.transfer(fromPrincipal, to, BigInt(amount));

      if ("ok" in result) {
        return result.ok;
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error transferring funds:", error);
      throw new Error(`Failed to transfer funds: ${error}`);
    }
  },

  /**
   * Credit (add funds to) a user's wallet
   * This function is typically called by authorized controllers (like admin functions)
   * to add funds to a user's wallet after external payments
   */
  async creditWallet(
    principal: Principal, 
    amount: number, 
    paymentChannel?: string, 
    description?: string
  ): Promise<string> {
    try {
      const actor = getWalletActor(true); // Requires authentication

      // Convert amount to bigint (assuming the amount is in the smallest unit)
      const amountBigInt = BigInt(Math.round(amount * 100)); // Convert to centavos

      const result = await (actor as any).credit(
        principal, 
        amountBigInt,
        paymentChannel ? [paymentChannel] : [],
        description ? [description] : []
      );

      if ("ok" in result) {
        return result.ok.toString();
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error crediting wallet:", error);
      throw new Error(`Failed to credit wallet: ${error}`);
    }
  },

  /**
   * Get transaction history for current user
   */
  async getTransactionHistory(): Promise<Transaction[]> {
    try {
      const actor = getWalletActor(true); // Requires authentication
      if (!currentIdentity) {
        throw new Error("No authenticated identity available");
      }

      const userPrincipal = Principal.fromText(
        currentIdentity.getPrincipal().toString(),
      );
      const transactions = await actor.get_transaction_history(userPrincipal);
      return transactions.map(convertCanisterTransaction);
    } catch (error) {
      //console.error("Error fetching transaction history:", error);
      throw new Error(`Failed to fetch transaction history: ${error}`);
    }
  },

  /**
   * Get transaction history for a specific principal
   */
  async getTransactionHistoryOf(principal: Principal): Promise<Transaction[]> {
    try {
      const actor = getWalletActor();
      const transactions = await actor.get_transaction_history(principal);
      return transactions.map(convertCanisterTransaction);
    } catch (error) {
      //console.error("Error fetching transaction history for principal:", error);
      throw new Error(
        `Failed to fetch transaction history for principal: ${error}`,
      );
    }
  },
};

// Reset functions for authentication state changes
export const resetWalletActor = () => {
  walletActor = null;
};

export const refreshWalletActor = async () => {
  resetWalletActor();
  return await getWalletActor();
};

export default walletCanisterService;
