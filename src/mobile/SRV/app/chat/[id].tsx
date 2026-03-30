import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import {
  mockConversations,
  mockMessages,
  Conversation,
  Message,
} from "../../mock/data";

const PROVIDER_ID = "provider-1";

export default function ChatConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id || "";

  const [messageText, setMessageText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const conversation: Conversation | undefined = mockConversations.find(
    (c) => c.id === conversationId,
  );
  const messages: Message[] = mockMessages[conversationId] || [];

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, []);

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handleSend = () => {
    if (messageText.trim()) {
      setMessageText("");
      Keyboard.dismiss();
    }
  };

  const handleBack = () => {
    router.back();
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === PROVIDER_ID;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage
            ? styles.ownMessageContainer
            : styles.otherMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTimestamp,
              isOwnMessage
                ? styles.ownMessageTimestamp
                : styles.otherMessageTimestamp,
            ]}
          >
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={Colors.light.gray800}
            />
          </TouchableOpacity>
          {conversation && (
            <View style={styles.headerContent}>
              <Image
                source={{ uri: conversation.otherUserImage }}
                style={styles.headerAvatar}
              />
              <Text style={styles.headerName}>
                {conversation.otherUserName}
              </Text>
            </View>
          )}
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />

        {/* Message Composer */}
        <View style={styles.composerContainer}>
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.light.gray400}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !messageText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!messageText.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={
                  messageText.trim() ? Colors.light.white : Colors.light.gray400
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.gray50,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: Colors.light.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.gray200,
  },
  headerName: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.gray800,
    marginLeft: 10,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 8,
  },
  ownMessageContainer: {
    alignItems: "flex-end",
  },
  otherMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: "80%",
  },
  ownMessageBubble: {
    backgroundColor: "#3b82f6",
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: Colors.light.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: Colors.light.white,
  },
  otherMessageText: {
    color: Colors.light.gray800,
  },
  messageTimestamp: {
    fontSize: 11,
    marginTop: 4,
    position: "absolute",
    bottom: 8,
    right: 12,
  },
  ownMessageTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  otherMessageTimestamp: {
    color: Colors.light.gray400,
  },
  composerContainer: {
    backgroundColor: Colors.light.white,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.light.gray100,
    borderRadius: 20,
    paddingHorizontal: 12,
    minHeight: 40,
    maxHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.gray800,
    paddingVertical: 8,
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.blue600,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginVertical: 2,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.light.gray200,
  },
});
