import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import {
  mockProviderServices,
  Service,
  Package,
  mockDetailedBookings,
  BookingDetail,
} from "../../mock/data";

const { width } = Dimensions.get("window");

const TIME_SLOTS = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

const PAYMENT_METHODS = ["Cash on Hand", "GCash", "SRVWallet"];

function getNext14Days() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDayShort(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDayNum(d: Date) {
  return d.getDate().toString();
}

function formatDayFull(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const service: Service = mockProviderServices[0];
  const dates = getNext14Days();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash on Hand");

  const SERVICE_FEE = 50;

  const handleContinue = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      // @ts-ignore
      router.back();
    }
  };

  const handleConfirm = () => {
    console.log("Booking confirmed", {
      serviceId: service.id,
      serviceTitle: service.title,
      package: selectedPackage,
      date: selectedDate ? formatDayFull(selectedDate) : null,
      time: selectedTime,
      address,
      notes,
      paymentMethod,
    });
    router.push("/booking/confirmation");
  };

  const canContinue =
    currentStep === 0
      ? selectedPackage !== null
      : currentStep === 1
        ? selectedDate !== null && selectedTime !== null
        : currentStep === 2
          ? address.trim().length > 0
          : true;

  const subtotal = selectedPackage?.price || 0;
  const total = subtotal + SERVICE_FEE;

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2, 3].map((step) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            step === currentStep
              ? styles.stepDotActive
              : styles.stepDotInactive,
          ]}
        />
      ))}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color={Colors.light.gray800} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{service.title}</Text>
        <Text style={styles.headerSubtitle}>Step {currentStep + 1} of 4</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select a Package</Text>
      {service.packages.map((pkg) => {
        const isSelected = selectedPackage?.id === pkg.id;
        return (
          <TouchableOpacity
            key={pkg.id}
            style={[
              styles.packageCard,
              isSelected && styles.packageCardSelected,
            ]}
            onPress={() => setSelectedPackage(pkg)}
          >
            <View style={styles.packageRow}>
              <View style={styles.packageInfo}>
                <Text style={styles.packageName}>{pkg.name}</Text>
                <Text style={styles.packageDescription}>{pkg.description}</Text>
              </View>
              <Text style={styles.packagePrice}>
                ₱{pkg.price.toLocaleString()}
              </Text>
            </View>
            <View style={styles.radioOuter}>
              <View
                style={[
                  styles.radioInner,
                  isSelected && styles.radioInnerActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Choose Schedule</Text>
      <Text style={styles.sectionLabel}>Select Date</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateScrollContent}
      >
        {dates.map((d, idx) => {
          const isSelected =
            selectedDate !== null &&
            d.toDateString() === selectedDate.toDateString();
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.dateCard, isSelected && styles.dateCardSelected]}
              onPress={() => setSelectedDate(d)}
            >
              <Text
                style={[styles.dateDay, isSelected && styles.dateTextSelected]}
              >
                {formatDayShort(d)}
              </Text>
              <Text
                style={[styles.dateNum, isSelected && styles.dateTextSelected]}
              >
                {formatDayNum(d)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionLabel}>Select Time</Text>
      <View style={styles.timeGrid}>
        {TIME_SLOTS.map((slot) => {
          const isSelected = selectedTime === slot;
          return (
            <TouchableOpacity
              key={slot}
              style={[styles.timeSlot, isSelected && styles.timeSlotSelected]}
              onPress={() => setSelectedTime(slot)}
            >
              <Text
                style={[
                  styles.timeSlotText,
                  isSelected && styles.timeSlotTextSelected,
                ]}
              >
                {slot}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Location & Notes</Text>
      <Text style={styles.sectionLabel}>Service Address</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter your complete address"
        placeholderTextColor={Colors.light.gray400}
        value={address}
        onChangeText={setAddress}
      />
      <Text style={styles.sectionLabel}>Notes (Optional)</Text>
      <TextInput
        style={[styles.textInput, styles.textArea]}
        placeholder="Add any special instructions..."
        placeholderTextColor={Colors.light.gray400}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Payment & Confirm</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Selected Package</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryPackageName}>
            {selectedPackage?.name || ""}
          </Text>
          <Text style={styles.summaryPackagePrice}>
            ₱{subtotal.toLocaleString()}
          </Text>
        </View>
        <Text style={styles.summaryDetail}>
          {selectedDate ? formatDayFull(selectedDate) : ""} at {selectedTime}
        </Text>
        <Text style={styles.summaryDetail}>{address}</Text>
      </View>

      <Text style={styles.sectionLabel}>Payment Method</Text>
      {PAYMENT_METHODS.map((method) => {
        const isSelected = paymentMethod === method;
        return (
          <TouchableOpacity
            key={method}
            style={styles.paymentOption}
            onPress={() => setPaymentMethod(method)}
          >
            <View style={styles.radioOuter}>
              <View
                style={[
                  styles.radioInner,
                  isSelected && styles.radioInnerActive,
                ]}
              />
            </View>
            <Text style={styles.paymentOptionText}>{method}</Text>
          </TouchableOpacity>
        );
      })}

      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Price Breakdown</Text>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Subtotal</Text>
          <Text style={styles.breakdownValue}>
            ₱{subtotal.toLocaleString()}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Service Fee</Text>
          <Text style={styles.breakdownValue}>
            ₱{SERVICE_FEE.toLocaleString()}
          </Text>
        </View>
        <View style={styles.breakdownDivider} />
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownTotal}>Total</Text>
          <Text style={styles.breakdownTotalValue}>
            ₱{total.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderStepIndicator()}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {currentStep === 0 && renderStep1()}
        {currentStep === 1 && renderStep2()}
        {currentStep === 2 && renderStep3()}
        {currentStep === 3 && renderStep4()}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {currentStep < 3 ? (
          <TouchableOpacity
            style={[
              styles.continueBtn,
              !canContinue && styles.continueBtnDisabled,
            ]}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Confirm Booking</Text>
          </TouchableOpacity>
        )}
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.gray900,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.light.gray500,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    backgroundColor: Colors.light.white,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepDotActive: {
    backgroundColor: Colors.light.green,
  },
  stepDotInactive: {
    backgroundColor: Colors.light.gray200,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.gray900,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray600,
    marginBottom: 8,
    marginTop: 16,
  },
  packageCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.light.gray200,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  packageCardSelected: {
    borderColor: Colors.light.green,
    backgroundColor: Colors.light.green100,
  },
  packageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  packageInfo: {
    flex: 1,
    marginRight: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.gray900,
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 13,
    color: Colors.light.gray500,
    lineHeight: 18,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.green,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.light.gray300,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 16,
    right: 16,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "transparent",
  },
  radioInnerActive: {
    backgroundColor: Colors.light.green,
  },
  dateScrollContent: {
    gap: 10,
    paddingBottom: 8,
  },
  dateCard: {
    width: 60,
    height: 72,
    borderRadius: 14,
    backgroundColor: Colors.light.white,
    borderWidth: 2,
    borderColor: Colors.light.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCardSelected: {
    borderColor: Colors.light.green,
    backgroundColor: Colors.light.green100,
  },
  dateDay: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.gray500,
    marginBottom: 4,
  },
  dateNum: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.gray800,
  },
  dateTextSelected: {
    color: Colors.light.green,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeSlot: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.white,
    borderWidth: 2,
    borderColor: Colors.light.gray200,
  },
  timeSlotSelected: {
    borderColor: Colors.light.green,
    backgroundColor: Colors.light.green100,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray700,
  },
  timeSlotTextSelected: {
    color: Colors.light.green,
  },
  textInput: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.light.gray900,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },
  summaryCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.gray500,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryPackageName: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.gray900,
  },
  summaryPackagePrice: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.green,
  },
  summaryDetail: {
    fontSize: 13,
    color: Colors.light.gray500,
    marginBottom: 4,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  paymentOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.gray800,
    marginLeft: 12,
  },
  breakdownCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.gray900,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.light.gray600,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray800,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: Colors.light.gray200,
    marginVertical: 8,
  },
  breakdownTotal: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.light.gray900,
  },
  breakdownTotalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.green,
  },
  bottomPadding: {
    height: 100,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.light.white,
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray100,
  },
  continueBtn: {
    backgroundColor: Colors.light.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnDisabled: {
    backgroundColor: Colors.light.gray300,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  confirmBtn: {
    backgroundColor: Colors.light.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
});
