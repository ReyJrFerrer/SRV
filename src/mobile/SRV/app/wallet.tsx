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
import Colors from "../constants/Colors";
import { mockWalletBalance, mockTransactions, Transaction } from "../mock/data";

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WalletScreen() {
  const handleWithdraw = () => {
    router.push("/payout-settings");
  };

  const handleTransactionPress = (transactionId: string) => {
    router.push(`/receipt/${transactionId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(mockWalletBalance.availableBalance)}
              </Text>
            </View>
            <View style={styles.walletIconContainer}>
              <Ionicons name="wallet" size={28} color={Colors.light.white} />
            </View>
          </View>

          <View style={styles.balanceDetails}>
            <View style={styles.balanceDetailItem}>
              <Text style={styles.balanceDetailLabel}>Pending</Text>
              <Text style={styles.balanceDetailValue}>
                {formatCurrency(mockWalletBalance.pendingBalance)}
              </Text>
            </View>
            <View style={styles.balanceDetailDivider} />
            <View style={styles.balanceDetailItem}>
              <Text style={styles.balanceDetailLabel}>Total Earnings</Text>
              <Text style={styles.balanceDetailValue}>
                {formatCurrency(mockWalletBalance.totalEarnings)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.withdrawButton}
            onPress={handleWithdraw}
          >
            <Ionicons
              name="cash-outline"
              size={20}
              color={Colors.light.white}
            />
            <Text style={styles.withdrawButtonText}>Withdraw Funds</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionItem}>
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: Colors.light.blue50 },
              ]}
            >
              <Ionicons name="time" size={20} color={Colors.light.blue600} />
            </View>
            <Text style={styles.quickActionLabel}>Pending</Text>
            <Text style={styles.quickActionValue}>
              {formatCurrency(mockWalletBalance.pendingBalance)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem}>
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: Colors.light.green50 },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.light.green}
              />
            </View>
            <Text style={styles.quickActionLabel}>Completed</Text>
            <Text style={styles.quickActionValue}>
              {mockWalletBalance.totalEarnings -
                mockWalletBalance.totalWithdrawn}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem}>
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: Colors.light.purple50 },
              ]}
            >
              <Ionicons name="card" size={20} color={Colors.light.purple} />
            </View>
            <Text style={styles.quickActionLabel}>Withdrawn</Text>
            <Text style={styles.quickActionValue}>
              {formatCurrency(mockWalletBalance.totalWithdrawn)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transactions Section */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </View>

          {mockTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color={Colors.light.gray300}
              />
              <Text style={styles.emptyStateText}>No transactions yet</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {mockTransactions.map((transaction) => (
                <TouchableOpacity
                  key={transaction.id}
                  style={styles.transactionItem}
                  onPress={() => handleTransactionPress(transaction.id)}
                >
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={
                        transaction.type === "credit"
                          ? "arrow-down-circle"
                          : "arrow-up-circle"
                      }
                      size={24}
                      color={
                        transaction.type === "credit"
                          ? Colors.light.green
                          : Colors.light.red
                      }
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>
                      {transaction.title}
                    </Text>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.timestamp)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          transaction.type === "credit"
                            ? Colors.light.green
                            : Colors.light.red,
                      },
                    ]}
                  >
                    {transaction.type === "credit" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  balanceCard: {
    margin: 16,
    backgroundColor: Colors.light.blue600,
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.light.blue100,
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.light.white,
    marginTop: 4,
  },
  walletIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceDetails: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  balanceDetailItem: {
    flex: 1,
  },
  balanceDetailDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 16,
  },
  balanceDetailLabel: {
    fontSize: 12,
    color: Colors.light.blue200,
  },
  balanceDetailValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
    marginTop: 4,
  },
  withdrawButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    gap: 8,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue600,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
  },
  quickActionItem: {
    flex: 1,
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    color: Colors.light.gray500,
    fontWeight: "500",
  },
  quickActionValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginTop: 4,
  },
  transactionsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  transactionsList: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray50,
  },
  transactionIcon: {
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue900,
  },
  transactionDescription: {
    fontSize: 12,
    color: Colors.light.gray500,
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: Colors.light.gray400,
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: Colors.light.white,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.light.gray500,
    marginTop: 12,
  },
  bottomPadding: {
    height: 40,
  },
});
