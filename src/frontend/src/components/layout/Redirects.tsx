import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function ClientRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/client/home", { replace: true });
  }, [navigate]);

  return null;
}

export function ProviderRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/provider/home", { replace: true });
  }, [navigate]);

  return null;
}
