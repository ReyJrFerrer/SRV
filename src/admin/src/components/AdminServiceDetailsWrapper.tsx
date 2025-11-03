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

  // Pass serviceId and userId to ServiceDetailsPage
  // Since ServiceDetailsPage uses useParams internally, we need to ensure
  // the route params match what it expects
  return <ServiceDetailsPage />;
};

export default AdminServiceDetailsWrapper;
