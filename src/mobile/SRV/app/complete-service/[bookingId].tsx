import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  TextInput,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { mockBookings } from "../../mock/data";

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export default function CompleteServiceScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const booking = mockBookings.find((b) => b.id === bookingId);
  const [collectedAmount, setCollectedAmount] = useState(
    booking?.price.toString() || "0",
  );
  const [notes, setNotes] = useState("");

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Ionicons
            name="alert-circle"
            size={64}
            color={Colors.light.gray300}
          />
          <Text style={styles.errorText}>Service not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleConfirmCompletion = () => {
    router.push(`/receipt/${booking.id}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIconContainer}>
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={Colors.light.white}
            />
          </View>
          <Text style={styles.successTitle}>Complete Service</Text>
          <Text style={styles.successSubtitle}>
            Confirm the service has been completed
          </Text>
        </View>

        {/* Client Info */}
        <View style={styles.card}>
          <View style={styles.clientRow}>
            <Image
              source={{
                uri: booking.clientImage || "https://i.pravatar.cc/150",
              }}
              style={styles.clientImage}
            />
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{booking.clientName}</Text>
              <Text style={styles.serviceName}>{booking.serviceTitle}</Text>
              <Text style={styles.packageName}>{booking.packageName}</Text>
            </View>
          </View>
        </View>

        {/* Payment Collection */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Collection</Text>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Service Fee</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(booking.price)}
            </Text>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Commission (10%)</Text>
            <Text style={styles.commissionValue}>
              +{formatCurrency(booking.commission)}
            </Text>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Amount Collected</Text>
            <View style={styles.collectedInput}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.amountInput}
                value={collectedAmount}
                onChangeText={setCollectedAmount}
                keyboardType="numeric"
                placeholder="0.00"
              />
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Completion Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about the service..."
            placeholderTextColor={Colors.light.gray400}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Date</Text>
            <Text style={styles.summaryValue}>{booking.scheduledDate}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {booking.location}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Method</Text>
            <Text style={styles.summaryValue}>{booking.paymentMethod}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmCompletion}
          >
            <Ionicons name="checkmark" size={22} color={Colors.light.white} />
            <Text style={styles.confirmButtonText}>Confirm Completion</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
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
  successHeader: {
    backgroundColor: Colors.light.green,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.white,
  },
  successSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
  },
  card: {
    margin: 16,
    marginTop: 0,
    marginBottom: 0,
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  clientImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  serviceName: {
    fontSize: 14,
    color: Colors.light.gray600,
    marginTop: 2,
  },
  packageName: {
    fontSize: 13,
    color: Colors.light.gray500,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray50,
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.light.gray500,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.blue900,
  },
  commissionValue: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.green,
  },
  collectedInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.gray50,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.blue900,
  },
  amountInput: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.blue900,
    minWidth: 80,
    textAlign: "right",
  },
  notesInput: {
    backgroundColor: Colors.light.gray50,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.light.blue900,
    minHeight: 100,
    textAlignVertical: "top",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.light.gray500,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.blue900,
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },
  actionsContainer: {
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.green,
    borderRadius: 12,
    paddingVertical: 18,
    gap: 10,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.white,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.gray500,
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.gray500,
    marginTop: 16,
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.blue600,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.white,
  },
  bottomPadding: {
    height: 40,
  },
});
