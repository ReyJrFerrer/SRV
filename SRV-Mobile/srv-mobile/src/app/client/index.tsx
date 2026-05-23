import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function ClientIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/client/home");
  }, [router]);
  return null;
}
