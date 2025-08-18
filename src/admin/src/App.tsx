import { Routes, Route, Navigate } from "react-router-dom";
import { AdminHomePage } from "./pages/home";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<AdminHomePage />} />
      {/* Future routes can be added here */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
