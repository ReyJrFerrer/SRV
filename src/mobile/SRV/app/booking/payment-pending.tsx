import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "../../constants/Colors";

export default function PaymentPendingScreen() {
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "completed">(
    "pending",
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setPaymentStatus("completed");
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (paymentStatus === "completed") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successIconContainer}>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={Colors.light.green}
            />
          </View>

          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>
            Your booking has been confirmed
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/booking/booking-2" as never)}
            >
              <Text style={styles.primaryButtonText}>View Booking</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => router.push("/(client-tabs)" as never)}
            >
              <Text style={styles.outlineButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator
          size="large"
          color={Colors.light.blue600}
          style={styles.spinner}
        />

        <Text style={styles.processingTitle}>Processing Payment...</Text>
        <Text style={styles.processingSubtitle}>
          Please wait while we confirm your GCash payment
        </Text>

        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>₱500</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.white,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  spinner: {
    marginBottom: 24,
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 15,
    color: Colors.light.gray500,
    textAlign: "center",
    lineHeight: 22,
  },
  amountContainer: {
    marginTop: 40,
    backgroundColor: Colors.light.gray50,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.light.gray500,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.light.gray500,
    textAlign: "center",
    lineHeight: 22,
  },
  buttonContainer: {
    width: "100%",
    marginTop: 40,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.light.green,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  outlineButton: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray300,
    alignItems: "center",
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.gray700,
  },
});
