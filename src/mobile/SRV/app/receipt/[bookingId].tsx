import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { mockReceiptData, mockProfile } from "../../mock/data";

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export default function ReceiptScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const receipt =
    mockReceiptData.find((r) => r.bookingId === bookingId) ||
    mockReceiptData[0];

  const handleShare = () => {
    Alert.alert("Share Receipt", "Receipt copied to clipboard!");
  };

  const handlePrint = () => {
    Alert.alert("Print Receipt", "Sending to printer...");
  };

  const handleRateClient = () => {
    // @ts-ignore
    router.push(`/rate-client/${receipt.bookingId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={Colors.light.blue900}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receipt</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Success Banner */}
        <View style={styles.successBanner}>
          <View style={styles.successIcon}>
            <Ionicons
              name="checkmark-circle"
              size={56}
              color={Colors.light.white}
            />
          </View>
          <Text style={styles.successTitle}>Service Completed!</Text>
          <Text style={styles.successSubtitle}>
            Payment has been processed successfully
          </Text>
        </View>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          {/* Booking Info */}
          <View style={styles.receiptSection}>
            <Text style={styles.sectionLabel}>Booking Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Booking ID</Text>
              <Text style={styles.detailValue}>
                #{receipt.bookingId.slice(-8).toUpperCase()}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date Completed</Text>
              <Text style={styles.detailValue}>{receipt.dateCompleted}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue}>{receipt.serviceTitle}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Package</Text>
              <Text style={styles.detailValue}>{receipt.packageName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Client</Text>
              <Text style={styles.detailValue}>{receipt.clientName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{receipt.duration}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Payment Summary */}
          <View style={styles.receiptSection}>
            <Text style={styles.sectionLabel}>Payment Summary</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Service Price</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(receipt.price)}
              </Text>
            </View>
            {receipt.commission > 0 && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: Colors.light.red }]}>
                  Commission
                </Text>
                <Text style={[styles.detailValue, { color: Colors.light.red }]}>
                  -{formatCurrency(receipt.commission)}
                </Text>
              </View>
            )}
            <View style={styles.dividerSmall} />
            <View style={styles.detailRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(receipt.price - receipt.commission)}
              </Text>
            </View>
            <View style={styles.dividerSmall} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount Paid</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(receipt.amountPaid)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <View style={styles.methodBadge}>
                <Ionicons
                  name={
                    receipt.paymentMethod === "GCash"
                      ? "phone-portrait-outline"
                      : "cash-outline"
                  }
                  size={14}
                  color={Colors.light.blue600}
                />
                <Text style={styles.methodText}>{receipt.paymentMethod}</Text>
              </View>
            </View>
            {receipt.changeGiven > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Change Given</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(receipt.changeGiven)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={Colors.light.gray400}
          />
          <Text style={styles.disclaimerText}>
            This receipt serves as proof of service completion. Commission
            deductions are applied per SRV provider agreement.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handlePrint}>
            <Ionicons
              name="print-outline"
              size={20}
              color={Colors.light.blue600}
            />
            <Text style={styles.actionText}>Print</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons
              name="share-social-outline"
              size={20}
              color={Colors.light.blue600}
            />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Rate Client CTA */}
        <TouchableOpacity style={styles.rateButton} onPress={handleRateClient}>
          <Ionicons name="star" size={20} color={Colors.light.yellow400} />
          <Text style={styles.rateButtonText}>Rate Your Client</Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.light.white}
          />
        </TouchableOpacity>

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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: Colors.light.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  successBanner: {
    backgroundColor: Colors.light.green,
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.white,
  },
  successSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  receiptCard: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  receiptSection: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.light.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.light.gray600,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue900,
    textAlign: "right",
    flex: 1,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.light.blue600,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.gray100,
    marginHorizontal: 20,
  },
  dividerSmall: {
    height: 1,
    backgroundColor: Colors.light.gray100,
    marginVertical: 6,
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.blue50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  methodText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: Colors.light.gray400,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.white,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  rateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.blue900,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  rateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
    flex: 1,
    textAlign: "center",
  },
  bottomPadding: {
    height: 40,
  },
});
