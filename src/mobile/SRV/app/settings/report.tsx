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
import Colors from "../../constants/Colors";
import { mockTicketCategories, TicketCategory } from "../../mock/data";

export default function ReportScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) {
      setError("Please enter an issue title");
      return;
    }
    if (!selectedCategory) {
      setError("Please select a category");
      return;
    }
    if (!description.trim()) {
      setError("Please describe your issue");
      return;
    }
    setError("");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
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
          <Text style={styles.headerTitle}>Report an Issue</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={Colors.light.green}
            />
          </View>
          <Text style={styles.successTitle}>Report Submitted</Text>
          <Text style={styles.successMessage}>
            Thank you for your feedback. Our team will review your report and
            get back to you within 24-48 hours.
          </Text>
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => router.back()}
          >
            <Text style={styles.successButtonText}>Back to Settings</Text>
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
        <Text style={styles.headerTitle}>Report an Issue</Text>
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

        {/* Issue Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Issue Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Briefly describe the issue"
            placeholderTextColor={Colors.light.gray400}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {mockTicketCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === cat.id && styles.categoryCardActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    selectedCategory === cat.id && styles.categoryIconActive,
                  ]}
                >
                  <Ionicons
                    name={cat.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={
                      selectedCategory === cat.id
                        ? Colors.light.white
                        : Colors.light.blue600
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.categoryName,
                    selectedCategory === cat.id && styles.categoryNameActive,
                  ]}
                >
                  {cat.name}
                </Text>
                <Text style={styles.categoryDesc} numberOfLines={2}>
                  {cat.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Detailed Description</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Please provide as much detail as possible about the issue..."
            placeholderTextColor={Colors.light.gray400}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length} characters</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Ionicons name="paper-plane" size={20} color={Colors.light.white} />
          <Text style={styles.submitButtonText}>Submit Report</Text>
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
  label: {
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
  textArea: {
    minHeight: 140,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 11,
    color: Colors.light.gray400,
    textAlign: "right",
    marginTop: 6,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryCard: {
    width: "48%",
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.gray200,
  },
  categoryCardActive: {
    borderColor: Colors.light.blue600,
    backgroundColor: Colors.light.blue50,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.blue50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  categoryIconActive: {
    backgroundColor: Colors.light.blue600,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginBottom: 4,
  },
  categoryNameActive: {
    color: Colors.light.blue600,
  },
  categoryDesc: {
    fontSize: 11,
    color: Colors.light.gray500,
    lineHeight: 16,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.blue600,
    marginHorizontal: 16,
    marginTop: 24,
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
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
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
  successButton: {
    backgroundColor: Colors.light.blue600,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  bottomPadding: {
    height: 40,
  },
});
