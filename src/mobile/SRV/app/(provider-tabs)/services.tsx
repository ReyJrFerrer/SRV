import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import ServiceItemCard from "../../components/provider/ServiceItemCard";
import { mockServices, Service } from "../../mock/data";

const MAX_SERVICES = 5;

export default function MyServicesScreen() {
  const [services, setServices] = useState<Service[]>(mockServices);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  const handleServicePress = (serviceId: string) => {
    // @ts-ignore
    router.push(`/service/${serviceId}`);
  };

  const handleAddService = () => {
    if (services.length >= MAX_SERVICES) {
      Alert.alert(
        "Service Limit Reached",
        `You can only have up to ${MAX_SERVICES} services. Please delete an existing service to add a new one.`,
      );
      return;
    }
    // @ts-ignore
    router.push("/service/add");
  };

  const handleToggleStatus = (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              status: s.status === "Available" ? "Unavailable" : "Available",
            }
          : s,
      ),
    );
    const service = services.find((s) => s.id === serviceId);
    const newStatus =
      service?.status === "Available" ? "deactivated" : "activated";
    console.log(`Service ${newStatus}`);
  };

  const handleDeletePress = (service: Service) => {
    setServiceToDelete(service);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (serviceToDelete) {
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      setDeleteModalVisible(false);
      setServiceToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setServiceToDelete(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Services</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddService}>
          <Ionicons name="add" size={24} color={Colors.light.white} />
        </TouchableOpacity>
      </View>

      {services.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="construct" size={48} color={Colors.light.gray400} />
          </View>
          <Text style={styles.emptyTitle}>Add your first service</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleAddService}
          >
            <Text style={styles.emptyButtonText}>Add Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {services.length >= MAX_SERVICES && (
            <View style={styles.limitMessage}>
              <Text style={styles.limitText}>
                You've reached the maximum of {MAX_SERVICES} services
              </Text>
            </View>
          )}
          {services.map((service) => (
            <ServiceItemCard
              key={service.id}
              service={service}
              onPress={() => handleServicePress(service.id)}
              onToggleStatus={() => handleToggleStatus(service.id)}
              onDelete={() => handleDeletePress(service)}
            />
          ))}
        </ScrollView>
      )}

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Service?</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to delete {serviceToDelete?.title}?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelDelete}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.gray50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.light.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.blue600,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.light.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.gray600,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.light.blue600,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  limitMessage: {
    backgroundColor: Colors.light.yellow100,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  limitText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray700,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.red,
    textAlign: "center",
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 16,
    color: Colors.light.gray700,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray300,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.gray600,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.red,
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
});
