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
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
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
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>My Services</Text>
          <Text style={styles.headerSubtitle}>
            {services.length} of {MAX_SERVICES} services
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddService}>
          <Ionicons name="add" size={22} color={Colors.light.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {services.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrapper}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="briefcase-outline"
                size={40}
                color={Colors.light.gray400}
              />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No Services Yet</Text>
          <Text style={styles.emptyDescription}>
            Start by adding your first service to attract clients and grow your
            business.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleAddService}
          >
            <Ionicons name="add" size={20} color={Colors.light.white} />
            <Text style={styles.emptyButtonText}>Add Your First Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {services.length >= MAX_SERVICES && (
            <View style={styles.limitBanner}>
              <Ionicons
                name="information-circle"
                size={18}
                color={Colors.light.yellow700}
              />
              <Text style={styles.limitText}>
                You've reached the maximum of {MAX_SERVICES} services
              </Text>
            </View>
          )}

          <View style={styles.servicesList}>
            {services.map((service, index) => {
              const isActive = service.status === "Available";
              const minPrice = Math.min(
                ...service.packages.map((p) => p.price),
              );

              return (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
                  onPress={() => handleServicePress(service.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardImageSection}>
                    <Image
                      source={{
                        uri:
                          service.imageUrl ||
                          "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=200",
                      }}
                      style={styles.cardImage}
                    />
                    <View
                      style={[
                        styles.statusIndicator,
                        {
                          backgroundColor: isActive
                            ? Colors.light.green
                            : Colors.light.gray400,
                        },
                      ]}
                    >
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>
                        {isActive ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {service.title}
                    </Text>

                    <View style={styles.cardMeta}>
                      <View style={styles.ratingContainer}>
                        <Ionicons
                          name="star"
                          size={12}
                          color={Colors.light.yellow}
                        />
                        <Text style={styles.ratingValue}>{service.rating}</Text>
                        <Text style={styles.reviewCount}>
                          ({service.reviewCount})
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>From</Text>
                        <Text style={styles.priceValue}>
                          ₱{minPrice.toLocaleString()}
                        </Text>
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            isActive
                              ? styles.deactivateBtn
                              : styles.activateBtn,
                          ]}
                          onPress={() => handleToggleStatus(service.id)}
                        >
                          <Ionicons
                            name={isActive ? "pause" : "play"}
                            size={14}
                            color={
                              isActive
                                ? Colors.light.gray700
                                : Colors.light.white
                            }
                          />
                          <Text
                            style={[
                              styles.actionText,
                              isActive
                                ? styles.deactivateText
                                : styles.activateText,
                            ]}
                          >
                            {isActive ? "Pause" : "Activate"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeletePress(service)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={Colors.light.red}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
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
            <View style={styles.modalIconWrapper}>
              <Ionicons name="warning" size={32} color={Colors.light.red} />
            </View>
            <Text style={styles.modalTitle}>Delete Service?</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to delete "{serviceToDelete?.title}"? This
              action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelDelete}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
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
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.light.gray500,
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.blue600,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.yellow100,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  limitText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.yellow700,
    flex: 1,
  },
  servicesList: {
    gap: 16,
  },
  serviceCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageSection: {
    height: 140,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.light.gray100,
  },
  statusIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.light.white,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginBottom: 8,
    lineHeight: 22,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  reviewCount: {
    fontSize: 13,
    color: Colors.light.gray500,
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray100,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.light.gray500,
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.green,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  activateBtn: {
    backgroundColor: Colors.light.green,
  },
  deactivateBtn: {
    backgroundColor: Colors.light.gray100,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  activateText: {
    color: Colors.light.white,
  },
  deactivateText: {
    color: Colors.light.gray700,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.red200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.red50,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    marginBottom: 20,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.light.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 15,
    color: Colors.light.gray500,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.blue600,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: Colors.light.blue600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
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
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  modalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.red50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.blue900,
    textAlign: "center",
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 15,
    color: Colors.light.gray600,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    alignItems: "center",
    backgroundColor: Colors.light.white,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.gray600,
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.red,
    alignItems: "center",
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
});
