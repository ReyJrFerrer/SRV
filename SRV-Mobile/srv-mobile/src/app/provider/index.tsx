import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function ProviderIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/provider/home");
  }, [router]);
  return null;
}
