import React from "react";
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

const termsSections = [
  {
    title: "1. Definitions",
    content:
      '"SRV" refers to the SRV platform, its website, mobile application, and all related services. "User" refers to any individual who accesses or uses the SRV platform. "Provider" refers to service providers who offer services through SRV. "Client" refers to individuals who book services through SRV.',
  },
  {
    title: "2. Eligibility",
    content:
      "You must be at least 18 years old to use SRV. By using the platform, you represent and warrant that you have the legal capacity to enter into these terms.",
  },
  {
    title: "3. Account Registration",
    content:
      "You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your account credentials.",
  },
  {
    title: "4. Platform Role",
    content:
      "SRV acts as a platform connecting service providers with clients. SRV is not a party to any service agreement between providers and clients. We do not employ, endorse, or guarantee the quality of any provider's services.",
  },
  {
    title: "5. User Conduct",
    content:
      "Users agree to use the platform lawfully and respectfully. Harassment, discrimination, fraud, or any form of abusive behavior is strictly prohibited and may result in account termination.",
  },
  {
    title: "6. Provider Terms",
    content:
      "Providers are independent contractors, not employees of SRV. Providers are responsible for their own taxes, insurance, and compliance with local regulations. Providers must accurately represent their services and qualifications.",
  },
  {
    title: "7. Client Terms",
    content:
      "Clients agree to provide accurate booking information and to be available at the scheduled time and location. Clients are responsible for ensuring a safe working environment for providers.",
  },
  {
    title: "8. Payments & Fees",
    content:
      "SRV charges a commission on completed bookings. The commission rate is displayed before booking confirmation. Payment processing is handled through secure third-party payment providers. SRV reserves the right to modify fee structures with prior notice.",
  },
  {
    title: "9. Reviews & Ratings",
    content:
      "Users may leave reviews and ratings after completed services. Reviews must be honest, fair, and based on actual experiences. SRV reserves the right to remove reviews that violate content guidelines.",
  },
  {
    title: "10. Cancellation Policy",
    content:
      "Cancellations made within the allowed time frame may be eligible for a refund. Late cancellations or no-shows may incur fees. Specific cancellation terms are displayed during the booking process.",
  },
  {
    title: "11. Intellectual Property",
    content:
      "All SRV branding, logos, and platform content are the intellectual property of SRV. Users may not reproduce, distribute, or create derivative works without written permission.",
  },
  {
    title: "12. Privacy",
    content:
      "SRV collects and processes personal data in accordance with our Privacy Policy. By using the platform, you consent to the collection and use of your information as described in our Privacy Policy.",
  },
  {
    title: "13. Dispute Resolution",
    content:
      "In the event of a dispute between a provider and client, SRV may mediate but is not liable for the outcome. Users agree to attempt to resolve disputes amicably before escalating.",
  },
  {
    title: "14. Limitation of Liability",
    content:
      "SRV shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of the platform. Our total liability shall not exceed the fees paid by you in the preceding 12 months.",
  },
  {
    title: "15. Indemnification",
    content:
      "Users agree to indemnify and hold harmless SRV from any claims, damages, or expenses arising from their use of the platform or violation of these terms.",
  },
  {
    title: "16. Termination",
    content:
      "SRV may suspend or terminate your account at any time for violations of these terms. Users may terminate their account by contacting support.",
  },
  {
    title: "17. Governing Law",
    content:
      "These terms are governed by the laws of the Republic of the Philippines. Any disputes shall be resolved in the courts of Metro Manila.",
  },
  {
    title: "18. Changes to Terms",
    content:
      "SRV reserves the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the modified terms.",
  },
];

export default function TermsScreen() {
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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title Card */}
        <View style={styles.titleCard}>
          <View style={styles.logoContainer}>
            <Ionicons
              name="document-text"
              size={32}
              color={Colors.light.blue600}
            />
          </View>
          <Text style={styles.mainTitle}>Terms and Conditions for SRV</Text>
          <Text style={styles.lastUpdated}>Last Updated: March 2026</Text>
        </View>

        {/* Terms Sections */}
        <View style={styles.termsContainer}>
          {termsSections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}
        </View>

        {/* Agreement */}
        <View style={styles.agreementCard}>
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={Colors.light.green}
          />
          <Text style={styles.agreementText}>
            By using SRV, you acknowledge that you have read, understood, and
            agree to be bound by these Terms and Conditions.
          </Text>
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
  titleCard: {
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
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.blue50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.blue900,
    textAlign: "center",
  },
  lastUpdated: {
    fontSize: 13,
    color: Colors.light.gray500,
    marginTop: 8,
  },
  termsContainer: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: Colors.light.gray600,
    lineHeight: 22,
  },
  agreementCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.light.green50,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  agreementText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.gray700,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
