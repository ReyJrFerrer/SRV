import { useCallback, useState } from "react";

interface WaitlistResponse {
  message: string;
  success?: boolean;
  count?: number;
}

export function useWaitlist() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const submit = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setMessage("");
    setIsSuccess(false);
    try {
      const res = await fetch("waitlist.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data: WaitlistResponse = await res.json();
      setMessage(data.message || "");
      setIsSuccess(!!data.success);
      if (data.success) {
        setEmail("");
      }
    } catch (err) {
      setMessage("Failed to join waitlist. Please try again.");
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const reset = useCallback(() => {
    setMessage("");
    setIsSuccess(false);
    setIsLoading(false);
  }, []);

  return { email, setEmail, message, isLoading, isSuccess, submit, reset };
}
