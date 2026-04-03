import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { mockPayoutForm } from "../mock/data";

const BUSINESS_TYPES = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "CORPORATION", label: "Corporation" },
  { value: "PARTNERSHIP", label: "Partnership" },
] as const;

export default function PayoutSettingsScreen() {
  const [gcashNumber, setGcashNumber] = useState(mockPayoutForm.gcashNumber);
  const [gcashName, setGcashName] = useState(mockPayoutForm.gcashName);
  const [businessName, setBusinessName] = useState(mockPayoutForm.businessName);
  const [businessType, setBusinessType] = useState<string>(
    mockPayoutForm.businessType,
  );
  const [email, setEmail] = useState(mockPayoutForm.email);
  const [phoneNumber, setPhoneNumber] = useState(mockPayoutForm.phoneNumber);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!gcashNumber.trim()) {
      setError("GCash number is required");
      return;
    }
    if (!gcashName.trim()) {
      setError("GCash account name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!phoneNumber.trim()) {
      setError("Phone number is required");
      return;
    }
    setError("");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons
              name="checkmark-circle"
              size={72}
              color={Colors.light.green}
            />
          </View>
          <Text style={styles.successTitle}>Welcome to SRV!</Text>
          <Text style={styles.successMessage}>
            Your payout account has been set up successfully. You can now
            receive payments directly to your GCash account.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/(provider-tabs)")}
          >
            <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/wallet")}
          >
            <Ionicons
              name="wallet-outline"
              size={20}
              color={Colors.light.blue600}
            />
            <Text style={styles.secondaryButtonText}>View Wallet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Payout Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.light.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* GCash Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GCash Details</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GCash Number *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="09XX XXX XXXX"
                placeholderTextColor={Colors.light.gray400}
                value={gcashNumber}
                onChangeText={setGcashNumber}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GCash Account Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Full name on GCash account"
                placeholderTextColor={Colors.light.gray400}
                value={gcashName}
                onChangeText={setGcashName}
              />
            </View>
          </View>
        </View>

        {/* Business Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Name (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Business or brand name"
                placeholderTextColor={Colors.light.gray400}
                value={businessName}
                onChangeText={setBusinessName}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Type</Text>
              <View style={styles.typeRow}>
                {BUSINESS_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeChip,
                      businessType === type.value && styles.typeChipActive,
                    ]}
                    onPress={() => setBusinessType(type.value)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        businessType === type.value &&
                          styles.typeChipTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="your@email.com"
                placeholderTextColor={Colors.light.gray400}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="+63 9XX XXX XXXX"
                placeholderTextColor={Colors.light.gray400}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons
            name="shield-checkmark"
            size={20}
            color={Colors.light.green}
          />
          <Text style={styles.securityText}>
            Your payment information is securely stored with Xendit, our
            PCI-compliant payment partner.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={Colors.light.white}
          />
          <Text style={styles.submitButtonText}>Complete Setup</Text>
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.red100,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: Colors.light.red,
    fontWeight: "500",
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.gray500,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.blue900,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.light.gray50,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.blue900,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.light.gray50,
    borderWidth: 1.5,
    borderColor: Colors.light.gray200,
    alignItems: "center",
  },
  typeChipActive: {
    backgroundColor: Colors.light.blue50,
    borderColor: Colors.light.blue600,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.gray500,
  },
  typeChipTextActive: {
    color: Colors.light.blue600,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.light.green50,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: Colors.light.gray700,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.blue600,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: Colors.light.gray50,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: Colors.light.gray600,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: Colors.light.blue600,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  bottomPadding: {
    height: 40,
  },
});
