import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";

const faqData = [
  {
    question: "How do I manage my services?",
    answer:
      "Go to the Services tab to add, edit, or deactivate your services. You can set pricing packages, availability, and service areas.",
  },
  {
    question: "How do I receive payments?",
    answer:
      "Payments are processed through SRVWallet. Cash payments are collected directly, and digital payments are released after service completion.",
  },
  {
    question: "How is my reputation score calculated?",
    answer:
      "Your reputation score is based on completion rate, response rate, average rating, and client reviews. Maintain high standards to improve your score.",
  },
  {
    question: "What is the commission rate?",
    answer:
      "SRV charges a commission on each completed booking. The exact rate depends on your service category and is displayed during service setup.",
  },
  {
    question: "How do I handle booking cancellations?",
    answer:
      "You can decline or cancel bookings from the Bookings tab. Frequent cancellations may affect your reputation score and visibility.",
  },
];

export default function ProviderHelpScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Logo Card */}
        <View style={styles.logoCard}>
          <View style={styles.logoCircle}>
            <Ionicons name="help-buoy" size={32} color={Colors.light.blue600} />
          </View>
          <Text style={styles.logoTitle}>Help & Support</Text>
          <Text style={styles.logoSubtitle}>
            We're here to help you succeed
          </Text>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqCard}>
            {faqData.map((item, index) => (
              <View key={index}>
                <TouchableOpacity
                  style={styles.faqItem}
                  onPress={() => toggleAccordion(index)}
                >
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons
                    name={
                      expandedIndex === index ? "chevron-up" : "chevron-down"
                    }
                    size={20}
                    color={Colors.light.gray500}
                  />
                </TouchableOpacity>
                {expandedIndex === index && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{item.answer}</Text>
                  </View>
                )}
                {index < faqData.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactCard}>
            <TouchableOpacity style={styles.contactItem}>
              <View
                style={[
                  styles.contactIcon,
                  { backgroundColor: Colors.light.blue50 },
                ]}
              >
                <Ionicons name="mail" size={22} color={Colors.light.blue600} />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>hello@srvpinoy.com</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.light.gray400}
              />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => router.push("/settings/report")}
            >
              <View
                style={[
                  styles.contactIcon,
                  { backgroundColor: Colors.light.red100 },
                ]}
              >
                <Ionicons name="flag" size={22} color={Colors.light.red} />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Report</Text>
                <Text style={styles.contactValue}>Report a Problem</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.light.gray400}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Media */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Us</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialItem}>
              <View style={[styles.socialIcon, { backgroundColor: "#1877F2" }]}>
                <Ionicons
                  name="logo-facebook"
                  size={26}
                  color={Colors.light.white}
                />
              </View>
              <Text style={styles.socialLabel}>Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialItem}>
              <View style={[styles.socialIcon, { backgroundColor: "#E4405F" }]}>
                <Ionicons
                  name="logo-instagram"
                  size={26}
                  color={Colors.light.white}
                />
              </View>
              <Text style={styles.socialLabel}>Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialItem}>
              <View style={[styles.socialIcon, { backgroundColor: "#000000" }]}>
                <Ionicons
                  name="logo-tiktok"
                  size={26}
                  color={Colors.light.white}
                />
              </View>
              <Text style={styles.socialLabel}>TikTok</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.responseNote}>
          Average response time: 24-48 hours
        </Text>

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
  logoCard: {
    alignItems: "center",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 24,
    borderRadius: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.blue50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  logoSubtitle: {
    fontSize: 14,
    color: Colors.light.gray500,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
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
  faqCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  faqItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.blue900,
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  faqAnswerText: {
    fontSize: 14,
    color: Colors.light.gray600,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.gray100,
    marginLeft: 16,
  },
  contactCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: Colors.light.gray500,
    fontWeight: "500",
  },
  contactValue: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.blue900,
    marginTop: 2,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
  socialItem: {
    alignItems: "center",
    gap: 8,
  },
  socialIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  socialLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.light.gray600,
  },
  responseNote: {
    fontSize: 12,
    color: Colors.light.gray400,
    textAlign: "center",
    marginTop: 24,
  },
  bottomPadding: {
    height: 40,
  },
});
