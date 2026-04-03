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
import { mockServiceCategories, ServiceCategory } from "../mock/data";

interface PackageForm {
  id: string;
  name: string;
  description: string;
  price: string;
}

const STEPS = [
  { title: "Details", icon: "document-text-outline" },
  { title: "Availability", icon: "calendar-outline" },
  { title: "Location", icon: "location-outline" },
  { title: "Photos", icon: "camera-outline" },
  { title: "Review", icon: "checkmark-done-outline" },
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function ServiceAddScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [title, setTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageForm[]>([
    { id: "1", name: "", description: "", price: "" },
  ]);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(
    new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
  );
  const [address, setAddress] = useState("");

  const addPackage = () => {
    if (packages.length >= 5) {
      Alert.alert("Limit Reached", "Maximum 5 packages allowed");
      return;
    }
    setPackages([
      ...packages,
      { id: Date.now().toString(), name: "", description: "", price: "" },
    ]);
  };

  const removePackage = (id: string) => {
    if (packages.length <= 1) return;
    setPackages(packages.filter((p) => p.id !== id));
  };

  const updatePackage = (
    id: string,
    field: keyof PackageForm,
    value: string,
  ) => {
    setPackages(
      packages.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = () => {
    Alert.alert(
      "Service Created",
      "Your service has been created successfully!",
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((step, index) => (
        <View key={index} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              index <= currentStep && styles.stepCircleActive,
              index < currentStep && styles.stepCircleCompleted,
            ]}
          >
            {index < currentStep ? (
              <Ionicons name="checkmark" size={14} color={Colors.light.white} />
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  index <= currentStep && styles.stepNumberActive,
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.stepLabel,
              index <= currentStep && styles.stepLabelActive,
            ]}
          >
            {step.title}
          </Text>
          {index < STEPS.length - 1 && (
            <View
              style={[
                styles.stepLine,
                index < currentStep && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderDetailsStep = () => (
    <View>
      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Service Title *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., Home Cleaning Service"
          placeholderTextColor={Colors.light.gray400}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Category *</Text>
        <View style={styles.categoryGrid}>
          {mockServiceCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formSection}>
        <View style={styles.packageHeader}>
          <Text style={styles.formLabel}>Packages *</Text>
          <TouchableOpacity onPress={addPackage}>
            <Text style={styles.addPackageText}>+ Add Package</Text>
          </TouchableOpacity>
        </View>
        {packages.map((pkg, index) => (
          <View key={pkg.id} style={styles.packageForm}>
            <View style={styles.packageFormHeader}>
              <Text style={styles.packageFormTitle}>Package {index + 1}</Text>
              {packages.length > 1 && (
                <TouchableOpacity onPress={() => removePackage(pkg.id)}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={Colors.light.red}
                  />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Package name"
              placeholderTextColor={Colors.light.gray400}
              value={pkg.name}
              onChangeText={(v) => updatePackage(pkg.id, "name", v)}
            />
            <TextInput
              style={[styles.textInput, { marginTop: 8 }]}
              placeholder="Description"
              placeholderTextColor={Colors.light.gray400}
              value={pkg.description}
              onChangeText={(v) => updatePackage(pkg.id, "description", v)}
            />
            <TextInput
              style={[styles.textInput, { marginTop: 8 }]}
              placeholder="Price (PHP)"
              placeholderTextColor={Colors.light.gray400}
              value={pkg.price}
              onChangeText={(v) => updatePackage(pkg.id, "price", v)}
              keyboardType="numeric"
            />
          </View>
        ))}
      </View>
    </View>
  );

  const renderAvailabilityStep = () => (
    <View>
      <Text style={styles.formLabel}>Select Available Days *</Text>
      <View style={styles.daysContainer}>
        {DAYS.map((day) => {
          const isSelected = selectedDays.has(day);
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayChip, isSelected && styles.dayChipActive]}
              onPress={() => toggleDay(day)}
            >
              <Text
                style={[
                  styles.dayChipText,
                  isSelected && styles.dayChipTextActive,
                ]}
              >
                {day.slice(0, 3)}
              </Text>
              {isSelected && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={Colors.light.white}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.timeInfo}>
        <Ionicons name="time-outline" size={18} color={Colors.light.gray500} />
        <Text style={styles.timeInfoText}>
          Default hours: 8:00 AM - 5:00 PM for selected days
        </Text>
      </View>
    </View>
  );

  const renderLocationStep = () => (
    <View>
      <Text style={styles.formLabel}>Service Address *</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter your service address"
        placeholderTextColor={Colors.light.gray400}
        value={address}
        onChangeText={setAddress}
      />
      <TouchableOpacity style={styles.gpsButton}>
        <Ionicons
          name="locate-outline"
          size={20}
          color={Colors.light.blue600}
        />
        <Text style={styles.gpsButtonText}>Use Current Location</Text>
      </TouchableOpacity>
      <View style={styles.locationNote}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={Colors.light.gray500}
        />
        <Text style={styles.locationNoteText}>
          Your address will be shown as a general area to clients. Exact address
          is shared only after booking confirmation.
        </Text>
      </View>
    </View>
  );

  const renderPhotosStep = () => (
    <View>
      <Text style={styles.formLabel}>Service Photos</Text>
      <TouchableOpacity style={styles.uploadArea}>
        <Ionicons
          name="cloud-upload-outline"
          size={40}
          color={Colors.light.gray400}
        />
        <Text style={styles.uploadText}>Tap to upload photos</Text>
        <Text style={styles.uploadSubtext}>Up to 5 images, max 5MB each</Text>
      </TouchableOpacity>

      <Text style={[styles.formLabel, { marginTop: 24 }]}>
        Certifications (Optional)
      </Text>
      <TouchableOpacity style={styles.uploadArea}>
        <Ionicons
          name="document-attach-outline"
          size={40}
          color={Colors.light.gray400}
        />
        <Text style={styles.uploadText}>Upload certificates</Text>
        <Text style={styles.uploadSubtext}>
          PDF or image files, max 10MB each
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderReviewStep = () => (
    <View>
      <View style={styles.reviewCard}>
        <Text style={styles.reviewTitle}>Service Summary</Text>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Title</Text>
          <Text style={styles.reviewValue}>{title || "Not set"}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Category</Text>
          <Text style={styles.reviewValue}>
            {mockServiceCategories.find((c) => c.id === selectedCategory)
              ?.name || "Not selected"}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Packages</Text>
          <Text style={styles.reviewValue}>
            {packages.filter((p) => p.name).length} package(s)
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Available Days</Text>
          <Text style={styles.reviewValue}>{selectedDays.size} day(s)</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Address</Text>
          <Text style={styles.reviewValue}>{address || "Not set"}</Text>
        </View>
      </View>
      <View style={styles.reviewNote}>
        <Ionicons
          name="shield-checkmark-outline"
          size={18}
          color={Colors.light.green}
        />
        <Text style={styles.reviewNoteText}>
          Your service will be reviewed by our team before going live. This
          usually takes 24-48 hours.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={Colors.light.blue900}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Add Service ({currentStep + 1}/{STEPS.length})
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {renderStepIndicator()}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.stepContent}>
          {currentStep === 0 && renderDetailsStep()}
          {currentStep === 1 && renderAvailabilityStep()}
          {currentStep === 2 && renderLocationStep()}
          {currentStep === 3 && renderPhotosStep()}
          {currentStep === 4 && renderReviewStep()}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backNavButton} onPress={handleBack}>
            <Ionicons
              name="chevron-back"
              size={20}
              color={Colors.light.blue600}
            />
            <Text style={styles.backNavText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={currentStep === STEPS.length - 1 ? handleSubmit : handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === STEPS.length - 1 ? "Create Service" : "Next"}
          </Text>
          <Ionicons
            name={
              currentStep === STEPS.length - 1 ? "checkmark" : "chevron-forward"
            }
            size={20}
            color={Colors.light.white}
          />
        </TouchableOpacity>
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
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
    position: "relative",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: Colors.light.blue600,
  },
  stepCircleCompleted: {
    backgroundColor: Colors.light.green,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.light.gray500,
  },
  stepNumberActive: {
    color: Colors.light.white,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: Colors.light.gray400,
    marginTop: 4,
  },
  stepLabelActive: {
    color: Colors.light.blue600,
    fontWeight: "600",
  },
  stepLine: {
    position: "absolute",
    top: 14,
    right: -20,
    width: 32,
    height: 2,
    backgroundColor: Colors.light.gray200,
  },
  stepLineActive: {
    backgroundColor: Colors.light.green,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stepContent: {
    padding: 16,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.light.blue900,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.light.white,
    borderWidth: 1.5,
    borderColor: Colors.light.gray200,
  },
  categoryChipActive: {
    backgroundColor: Colors.light.blue50,
    borderColor: Colors.light.blue600,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.light.gray600,
  },
  categoryChipTextActive: {
    color: Colors.light.blue600,
    fontWeight: "600",
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  addPackageText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  packageForm: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  packageFormHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  packageFormTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.gray500,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.light.white,
    borderWidth: 1.5,
    borderColor: Colors.light.gray200,
    gap: 6,
  },
  dayChipActive: {
    backgroundColor: Colors.light.blue600,
    borderColor: Colors.light.blue600,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.gray600,
  },
  dayChipTextActive: {
    color: Colors.light.white,
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  timeInfoText: {
    fontSize: 13,
    color: Colors.light.gray500,
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.blue50,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  gpsButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  locationNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    gap: 8,
  },
  locationNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.light.gray500,
    lineHeight: 18,
  },
  uploadArea: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.gray200,
    borderStyle: "dashed",
    paddingVertical: 32,
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray600,
  },
  uploadSubtext: {
    fontSize: 12,
    color: Colors.light.gray400,
  },
  reviewCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginBottom: 16,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray50,
  },
  reviewLabel: {
    fontSize: 14,
    color: Colors.light.gray500,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue900,
  },
  reviewNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    backgroundColor: Colors.light.green50,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  reviewNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.light.gray700,
    lineHeight: 18,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: Colors.light.white,
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray100,
  },
  backNavButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 4,
  },
  backNavText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.blue600,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    marginLeft: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  bottomPadding: {
    height: 20,
  },
});
