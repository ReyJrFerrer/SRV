import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import { adminServiceCanister } from "../services/adminServiceCanister";
import {
  UserServicesHeader,
  UserServicesFilters,
  UserServicesList,
  type ServiceData,
} from "../components";
import {
  convertProfileToSimpleUserData,
  convertBackendServicesToServiceData,
  type SimpleUserData,
} from "../utils/serviceUtils";

const UserServicesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { users: backendUsers, refreshUsers } = useAdmin();
  const [user, setUser] = useState<SimpleUserData | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const loadUser = async () => {
      if (!id) {
        navigate("/users");
        return;
      }

      // If no backend users loaded yet, initialize and load them
      if (backendUsers.length === 0) {
        try {
          await refreshUsers();
          return;
        } catch (error) {
          console.error("Failed to load users:", error);
          setLoading(false);
          return;
        }
      }

      // Filter out any invalid profiles before searching
      const validUsers = backendUsers.filter(
        (profile) => profile && profile.id,
      );

      const foundProfile = validUsers.find(
        (profile) => String(profile.id) === id,
      );
      if (foundProfile) {
        const userData = convertProfileToSimpleUserData(foundProfile);
        setUser(userData);

        try {
          const servicesAndBookings =
            await adminServiceCanister.getUserServicesAndBookings(id);

          const combinedServices = convertBackendServicesToServiceData(
            servicesAndBookings.offeredServices,
            servicesAndBookings.clientBookings,
            servicesAndBookings.providerBookings,
            userData,
          );
          setServices(combinedServices);
        } catch (error) {
          setServices([]);
        }
      } else {
        // User not found in the backend users list
        console.warn(`User with id ${id} not found in backend users`);
      }

      setLoading(false);
    };

    loadUser();
  }, [id, backendUsers, navigate, refreshUsers]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch =
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || service.status === statusFilter;
      const matchesType = typeFilter === "all" || service.type === typeFilter;
      const matchesCategory =
        categoryFilter === "all" ||
        service.category.toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesType && matchesCategory;
    });
  }, [services, searchTerm, statusFilter, typeFilter, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentServices = filteredServices.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
        <button
          onClick={() => navigate("/users")}
          className="mt-2 inline-block text-blue-600 hover:text-blue-800"
        >
          Back to Users
        </button>
      </div>
    );
  }

  const categories = [...new Set(services.map((s) => s.category))];

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setCategoryFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <UserServicesHeader userId={user.id} userName={user.name} />
      <UserServicesFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        categoryFilter={categoryFilter}
        categories={categories}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        onCategoryChange={setCategoryFilter}
        onClearFilters={handleClearFilters}
      />
      <UserServicesList
        services={services}
        filteredServices={filteredServices}
        currentServices={currentServices}
        userId={id!}
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        categoryFilter={categoryFilter}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default UserServicesPage;
