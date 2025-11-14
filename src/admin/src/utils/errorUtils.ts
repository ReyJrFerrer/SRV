import { AdminServiceError } from "../services/adminServiceCanister";
import { MediaServiceError } from "../services/mediaServiceCanister";

export const isNetworkError = (error: any): boolean => {
  return (
    error?.code === "ERR_FAILED" ||
    error?.message?.includes("CORS") ||
    error?.name === "FirebaseError" ||
    (error?.code && String(error.code).includes("internal"))
  );
};

export const handleError = (
  error: unknown,
  context: string,
  toast: any,
): void => {
  if (error instanceof AdminServiceError || error instanceof MediaServiceError) {
    toast.error(`${context}: ${error.message}`);
  } else if (error instanceof Error) {
    toast.error(`${context}: ${error.message}`);
  } else {
    toast.error(`${context}: An unexpected error occurred`);
  }
};

