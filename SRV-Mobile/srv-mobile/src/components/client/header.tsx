import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SEARCH_PLACEHOLDERS = [
  "Looking for a plumber?",
  "Looking for an electrician?",
  "Looking for a cleaner?",
  "Looking for a tutor?",
  "Looking for a mechanic?",
  "Looking for a photographer?",
  "Looking for a pet sitter?",
  "Looking for a gardener?",
  "Looking for a painter?",
  "Looking for a babysitter?",
];

const MOCK_SERVICES = [
  { title: "Plumbing", providerName: "John Doe" },
  { title: "Electrical", providerName: "Jane Smith" },
  { title: "Cleaning", providerName: "CleanCo" },
  { title: "Tutoring", providerName: "EduPro" },
  { title: "Mechanic", providerName: "AutoFix" },
  { title: "Photography", providerName: "SnapShot" },
  { title: "Pet Sitting", providerName: "PawsCare" },
  { title: "Gardening", providerName: "GreenThumb" },
  { title: "Painting", providerName: "BrushMaster" },
  { title: "Babysitting", providerName: "KiddoCare" },
];

interface ClientHeaderProps {
  userName?: string;
}

export default function ClientHeader({
  userName = "Guest",
}: ClientHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholder, setPlaceholder] = useState(SEARCH_PLACEHOLDERS[0]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholder((prev) => {
        const idx = SEARCH_PLACEHOLDERS.indexOf(prev);
        return SEARCH_PLACEHOLDERS[(idx + 1) % SEARCH_PLACEHOLDERS.length];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredSuggestions = searchQuery.trim()
    ? MOCK_SERVICES.flatMap((s) => [s.title, s.providerName]).filter((name) =>
        name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(
        `/client/search-results?query=${encodeURIComponent(searchQuery.trim())}`,
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.topRow}>
        <View style={styles.logoWelcomeRow}>
          <Image
            source={require("@/assets/images/logo-glow.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.welcomeColumn}>
            <Text style={styles.welcomePrefix}>Welcome,</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        </View>
        <Pressable style={styles.menuButton}>
          <SymbolView
            name={{ ios: "line.3.horizontal", android: "menu", web: "menu" }}
            weight="semibold"
            size={28}
            tintColor="#2563EB"
          />
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.searchCard}>
        <Pressable style={styles.locationRow} disabled>
          <SymbolView
            name={{ ios: "mappin", android: "location_on", web: "location_on" }}
            weight="medium"
            size={24}
            tintColor="#EAB308"
          />
          <Text style={styles.locationLabel}>My Location</Text>
        </Pressable>

        <View style={styles.searchWrapper}>
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setShowSuggestions(text.trim().length > 0);
            }}
            onSubmitEditing={handleSearch}
            onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            returnKeyType="search"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {filteredSuggestions.map((suggestion, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    pressed && styles.suggestionItemPressed,
                  ]}
                  onPress={() => {
                    setSearchQuery(suggestion);
                    setShowSuggestions(false);
                    router.push(
                      `/client/search-results?query=${encodeURIComponent(suggestion)}`,
                    );
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "magnifyingglass",
                      android: "search",
                      web: "search",
                    }}
                    weight="light"
                    size={14}
                    tintColor="#9CA3AF"
                  />
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoWelcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 56,
    height: 56,
  },
  welcomeColumn: {
    flexDirection: "column",
  },
  welcomePrefix: {
    fontSize: 14,
    color: "#1D4ED8",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  menuButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  divider: {
    height: 1,
    backgroundColor: "#FDE68A",
    marginVertical: 12,
  },
  searchCard: {
    backgroundColor: "#FEF9C3",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 16,
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  searchWrapper: {
    marginTop: 12,
    position: "relative",
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#111827",
  },
  suggestionsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    zIndex: 50,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionItemPressed: {
    backgroundColor: "#EFF6FF",
  },
  suggestionText: {
    fontSize: 14,
    color: "#374151",
  },
});
