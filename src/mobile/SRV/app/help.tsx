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
import Colors from "../constants/Colors";

const faqData = [
  {
    question: "How do I book a service?",
    answer:
      "Browse services, select a package, choose your schedule, and confirm your booking.",
  },
  {
    question: "How do I cancel a booking?",
    answer:
      "Go to your bookings, select the booking you want to cancel, and tap 'Cancel Booking'.",
  },
  {
    question: "What payment methods are accepted?",
    answer: "We accept Cash on Hand, GCash, and SRVWallet.",
  },
  {
    question: "How do I contact my provider?",
    answer:
      "You can message your provider directly through the chat feature in your booking details.",
  },
];

export default function HelpScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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

        {/* Contact Support Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Contact Us</Text>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => console.log("Email pressed")}
            >
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
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => console.log("Phone pressed")}
            >
              <View
                style={[
                  styles.contactIcon,
                  { backgroundColor: Colors.light.green50 },
                ]}
              >
                <Ionicons name="call" size={22} color={Colors.light.green} />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>+63 912 345 6789</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Media Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Us</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialItem}
              onPress={() => console.log("Facebook pressed")}
            >
              <View style={[styles.socialIcon, { backgroundColor: "#1877F2" }]}>
                <Ionicons
                  name="logo-facebook"
                  size={26}
                  color={Colors.light.white}
                />
              </View>
              <Text style={styles.socialLabel}>Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialItem}
              onPress={() => console.log("Instagram pressed")}
            >
              <View style={[styles.socialIcon, { backgroundColor: "#E4405F" }]}>
                <Ionicons
                  name="logo-instagram"
                  size={26}
                  color={Colors.light.white}
                />
              </View>
              <Text style={styles.socialLabel}>Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialItem}
              onPress={() => console.log("TikTok pressed")}
            >
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

        {/* Report a Problem Button */}
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => console.log("Report a Problem pressed")}
        >
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color={Colors.light.red}
          />
          <Text style={styles.reportButtonText}>Report a Problem</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.light.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.gray50,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  headerSpacer: {
    width: 40,
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
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
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
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.red100,
    gap: 8,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.red,
  },
  bottomPadding: {
    height: 40,
  },
});
