// Canister Initialization Service
import { adminServiceCanister } from "./adminServiceCanister";
import { remittanceServiceCanister } from "./remittanceServiceCanister";

interface CanisterInitResult {
  name: string;
  success: boolean;
  error?: string;
}

export const initializeCanisterReferences = async (): Promise<{
  success: boolean;
  results: CanisterInitResult[];
}> => {
  // console.log("🔧 Initializing canister references instantly...");

  // Initialize canister references for each service in parallel for speed
  const initializationTasks = [
    {
      name: "admin",
      task: adminServiceCanister.setCanisterReferences(),
    },
    {
      name: "remittance",
      task: remittanceServiceCanister.setCanisterReferences(),
    },
  ];

  // Execute all initialization tasks in parallel for maximum speed
  const settledResults = await Promise.allSettled(
    initializationTasks.map(async ({ name, task }) => {
      try {
        await task;
        return { name, success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return { name, success: false, error: errorMessage };
      }
    }),
  );

  // Process results
  const results = settledResults.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : { name: "Unknown", success: false, error: "Promise rejected" },
  );
  const overallSuccess = results.every((result) => result.success);

  return { success: overallSuccess, results };
};

/**
 * Check if canister initialization should be performed
 * Only perform for authenticated users
 */
export const shouldInitializeCanisters = (
  isAuthenticated: boolean,
  identity: any,
): boolean => {
  return isAuthenticated && identity && !identity.getPrincipal().isAnonymous();
};
