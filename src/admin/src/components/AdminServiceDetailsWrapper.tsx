import React from "react";
import { useParams, Navigate } from "react-router-dom";
import ServiceDetailsPage from "../pages/serviceDetails";

const AdminServiceDetailsWrapper: React.FC = () => {
  const { id: serviceId, userId } = useParams<{
    id: string;
    userId: string;
  }>();

  if (!serviceId || !userId) {
    return <Navigate to="/dashboard" replace />;
  }
  return <ServiceDetailsPage />;
};

export default AdminServiceDetailsWrapper;
