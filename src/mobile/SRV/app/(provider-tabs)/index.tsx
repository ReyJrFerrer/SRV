import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import {
  mockProfile,
  mockStats,
  mockServices,
  mockBookings,
} from "../../mock/data";

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString()}`;
}

export default function ProviderHomeScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const pendingBookings = mockBookings.filter(
    (b) => b.status === "Requested" || b.status === "Pending",
  );
  const upcomingBookings = mockBookings.filter(
    (b) => b.status === "Accepted" || b.status === "Confirmed",
  );
  const activeServices = mockServices.filter((s) => s.status === "Available");

  const handleWalletPress = () => {

  };

  const handleServicePress = (serviceId: string) => {
    
  };

  const handleAddService = () => {

  };

  const handleBookingsPress = () => {
    router.push("/(provider-tabs)/bookings");
  };

  const handleProfilePress = () => {

  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.blue600}
          />
        }
      >

        {/* Wallet Balance Card */}
        <TouchableOpacity style={styles.walletCard} onPress={handleWalletPress}>
          <View style={styles.walletLeft}>
            <View style={styles.walletIconContainer}>
              <Ionicons name="wallet" size={24} color={Colors.light.blue600} />
            </View>
            <View>
              <Text style={styles.walletLabel}>SRV Wallet</Text>
              <Text style={styles.walletBalance}>
                {formatCurrency(mockStats.earningsThisMonth)}
              </Text>
            </View>
          </View>
          <View style={styles.walletButton}>
            <Text style={styles.walletButtonText}>View Wallet</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.light.white}
            />
          </View>
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={20} color={Colors.light.blue600} />
              <Text style={styles.statValue}>
                {formatCurrency(mockStats.earningsThisMonth)}
              </Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.light.green}
              />
              <Text style={styles.statValue}>{mockStats.completedJobs}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={20} color={Colors.light.yellow} />
              <Text style={styles.statValue}>{mockStats.averageRating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons
                name="trending-up"
                size={20}
                color={Colors.light.indigo}
              />
              <Text style={styles.statValue}>{mockStats.completionRate}%</Text>
              <Text style={styles.statLabel}>Rate</Text>
            </View>
          </ScrollView>
        </View>

        {/* Bookings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bookings</Text>
            <TouchableOpacity onPress={handleBookingsPress}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bookingCards}>
            <TouchableOpacity
              style={styles.bookingCardYellow}
              onPress={handleBookingsPress}
            >
              <View style={styles.bookingIconYellow}>
                <Ionicons name="time" size={24} color={Colors.light.white} />
              </View>
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingNumber}>
                  {pendingBookings.length}
                </Text>
                <Text style={styles.bookingLabel}>Pending Requests</Text>
              </View>
              <View style={styles.bookingActionYellow}>
                <Text style={styles.bookingActionText}>View</Text>
                <Ionicons name="arrow-forward" size={14} color="#92400e" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bookingCardBlue}
              onPress={handleBookingsPress}
            >
              <View style={styles.bookingIconBlue}>
                <Ionicons
                  name="calendar"
                  size={24}
                  color={Colors.light.white}
                />
              </View>
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingNumber}>
                  {upcomingBookings.length}
                </Text>
                <Text style={styles.bookingLabel}>Upcoming Jobs</Text>
              </View>
              <View style={styles.bookingActionBlue}>
                <Text style={styles.bookingActionTextBlue}>View</Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={Colors.light.blue700}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Services Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Services</Text>
            <TouchableOpacity onPress={handleAddService}>
              <Text style={styles.addServiceText}>+ Add new</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.servicesScroll}
          >
            {mockServices.slice(0, 5).map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => handleServicePress(service.id)}
              >
                <Image
                  source={{
                    uri:
                      service.imageUrl ||
                      "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=200",
                  }}
                  style={styles.serviceImage}
                />
                <View style={styles.serviceContent}>
                  <Text style={styles.serviceTitle} numberOfLines={2}>
                    {service.title}
                  </Text>
                  <View style={styles.serviceRating}>
                    <Ionicons
                      name="star"
                      size={12}
                      color={Colors.light.yellow}
                    />
                    <Text style={styles.serviceRatingText}>
                      {service.rating} ({service.reviewCount})
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.serviceStatusBadge,
                      {
                        backgroundColor:
                          service.status === "Available"
                            ? Colors.light.green100
                            : Colors.light.gray100,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.serviceStatusText,
                        {
                          color:
                            service.status === "Available"
                              ? Colors.light.green
                              : Colors.light.gray600,
                        },
                      ]}
                    >
                      {service.status === "Available" ? "ACTIVE" : "INACTIVE"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Analytics Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Analytics</Text>
          </View>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsRow}>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsLabel}>Total Earnings</Text>
                <Text style={styles.analyticsValue}>
                  {formatCurrency(mockStats.totalEarnings)}
                </Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsLabel}>Active Services</Text>
                <Text style={styles.analyticsValue}>
                  {activeServices.length}
                </Text>
              </View>
            </View>
            <View style={styles.analyticsRow}>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsLabel}>Total Reviews</Text>
                <Text style={styles.analyticsValue}>
                  {mockStats.totalReviews}
                </Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsLabel}>Completed Jobs</Text>
                <Text style={styles.analyticsValue}>
                  {mockStats.completedJobs}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: Colors.light.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.light.blue100,
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: Colors.light.gray500,
    fontWeight: "500",
  },
  providerName: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: Colors.light.gray500,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.gray50,
    alignItems: "center",
    justifyContent: "center",
  },
  walletCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.light.blue100,
  },
  walletLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.blue50,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  walletLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.blue700,
  },
  walletBalance: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  walletButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.blue600,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
  },
  walletButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.white,
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 14,
    marginRight: 10,
    minWidth: 100,
    alignItems: "center",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.gray500,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  addServiceText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.green,
  },
  bookingCards: {
    gap: 12,
  },
  bookingCardYellow: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.yellow200,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bookingIconYellow: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.light.yellow400,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  bookingLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#92400e",
    marginTop: 2,
  },
  bookingActionYellow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.yellow100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  bookingActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
  },
  bookingCardBlue: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.blue200,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bookingIconBlue: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.light.blue600,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  bookingActionBlue: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.blue100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  bookingActionTextBlue: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.light.blue700,
  },
  servicesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  serviceCard: {
    width: 160,
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceImage: {
    width: "100%",
    height: 90,
    backgroundColor: Colors.light.gray100,
  },
  serviceContent: {
    padding: 10,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.blue900,
    height: 36,
  },
  serviceRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  serviceRatingText: {
    fontSize: 11,
    color: Colors.light.gray500,
  },
  serviceStatusBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  serviceStatusText: {
    fontSize: 9,
    fontWeight: "700",
  },
  analyticsCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  analyticsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  analyticsItem: {
    flex: 1,
  },
  analyticsLabel: {
    fontSize: 12,
    color: Colors.light.gray500,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginTop: 4,
  },
  bottomPadding: {
    height: 100,
  },
});
