import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Buffer "mo:base/Buffer";
import Types "../types/shared";

persistent actor ChatCanister {
    // Type definitions
    type Message = Types.Message;
    type Conversation = Types.Conversation;
    type ConversationSummary = Types.ConversationSummary;
    type MessagePage = Types.MessagePage;
    type MessageStatus = Types.MessageStatus;
    type MessageType = Types.MessageType;
    type EncryptedContent = Types.EncryptedContent;
    type FileAttachment = Types.FileAttachment;
    type Result<T> = Types.Result<T>;

    // State variables
    private var conversationEntries : [(Text, Conversation)] = [];
    private var messageEntries : [(Text, Message)] = [];
    private transient var conversations = HashMap.HashMap<Text, Conversation>(10, Text.equal, Text.hash);
    private transient var messages = HashMap.HashMap<Text, Message>(100, Text.equal, Text.hash);
    
    // Index for efficient querying
    private transient var userConversations = HashMap.HashMap<Principal, [Text]>(10, Principal.equal, Principal.hash);
    private transient var conversationMessages = HashMap.HashMap<Text, [Text]>(10, Text.equal, Text.hash);

    // Canister references
    private transient var authCanisterId : ?Principal = null;
    private transient var bookingCanisterId : ?Principal = null;

    // Initialize
    system func preupgrade() {
        conversationEntries := Iter.toArray(conversations.entries());
        messageEntries := Iter.toArray(messages.entries());
    };

    system func postupgrade() {
        conversations := HashMap.fromIter<Text, Conversation>(conversationEntries.vals(), 10, Text.equal, Text.hash);
        messages := HashMap.fromIter<Text, Message>(messageEntries.vals(), 100, Text.equal, Text.hash);
        conversationEntries := [];
        messageEntries := [];
        
        // Rebuild indexes
        rebuildIndexes();
    };

    // Set canister references
    public shared(_msg) func setCanisterReferences(
        auth : ?Principal,
        booking : ?Principal
    ) : async Result<Text> {
        authCanisterId := auth;
        bookingCanisterId := booking;
        return #ok("Canister references set successfully");
    };

    // Private helper functions
    private func rebuildIndexes() {
        // Rebuild user conversations index
        for ((conversationId, conversation) in conversations.entries()) {
            updateUserConversationIndex(conversation.clientId, conversationId);
            updateUserConversationIndex(conversation.providerId, conversationId);
        };
        
        // Rebuild conversation messages index
        for ((messageId, message) in messages.entries()) {
            updateConversationMessageIndex(message.conversationId, messageId);
        };
    };

    private func updateUserConversationIndex(userId : Principal, conversationId : Text) {
        switch (userConversations.get(userId)) {
            case (?existing) {
                let buffer = Buffer.fromArray<Text>(existing);
                buffer.add(conversationId);
                userConversations.put(userId, Buffer.toArray(buffer));
            };
            case (null) {
                userConversations.put(userId, [conversationId]);
            };
        };
    };

    private func updateConversationMessageIndex(conversationId : Text, messageId : Text) {
        switch (conversationMessages.get(conversationId)) {
            case (?existing) {
                let buffer = Buffer.fromArray<Text>(existing);
                buffer.add(messageId);
                conversationMessages.put(conversationId, Buffer.toArray(buffer));
            };
            case (null) {
                conversationMessages.put(conversationId, [messageId]);
            };
        };
    };

    private func generateId() : Text {
        Nat.toText(Int.abs(Time.now()));
    };

    // Placeholder encryption functions (implement proper encryption later)
    private func encryptMessage(content : Text, key : Text) : EncryptedContent {
        // TODO: Implement proper encryption
        {
            encryptedText = content;
            encryptionKey = key;
        }
    };

    private func decryptMessage(encryptedContent : EncryptedContent) : Text {
        // TODO: Implement proper decryption
        encryptedContent.encryptedText
    };

    // Public functions

    // Create a conversation (called when booking is completed)
    public shared(msg) func createConversation(
        clientId : Principal,
        providerId : Principal
    ) : async Result<Conversation> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        // TODO: Verify booking exists and is completed
        
        let conversationId = generateId();
        let now = Time.now();
        
        let newConversation : Conversation = {
            id = conversationId;
            clientId = clientId;
            providerId = providerId;
            createdAt = now;
            lastMessageAt = null;
            isActive = true;
            unreadCount = [(clientId, 0), (providerId, 0)];
        };
        
        conversations.put(conversationId, newConversation);
        updateUserConversationIndex(clientId, conversationId);
        updateUserConversationIndex(providerId, conversationId);
        
        return #ok(newConversation);
    };

    // Send a message
    public shared(msg) func sendMessage(
        conversationId : Text,
        receiverId : Principal,
        content : Text
    ) : async Result<Message> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        switch (conversations.get(conversationId)) {
            case (?conversation) {
                if (not conversation.isActive) {
                    return #err("Conversation is not active");
                };
                
                if (caller != conversation.clientId and caller != conversation.providerId) {
                    return #err("Unauthorized to send message in this conversation");
                };

                if (receiverId != conversation.clientId and receiverId != conversation.providerId) {
                    return #err("Receiver not part of this conversation");
                };

                if (caller == receiverId) {
                    return #err("Cannot send message to yourself");
                };

                let messageId = generateId();
                let now = Time.now();
                let encryptionKey = generateId(); // Generate unique encryption key
                let encryptedContent = encryptMessage(content, encryptionKey);
                
                let newMessage : Message = {
                    id = messageId;
                    conversationId = conversationId;
                    senderId = caller;
                    receiverId = receiverId;
                    messageType = #Text;
                    content = encryptedContent;
                    attachment = null;
                    status = #Sent;
                    createdAt = now;
                    readAt = null;
                };
                
                messages.put(messageId, newMessage);
                updateConversationMessageIndex(conversationId, messageId);
                
                // Update conversation
                let updatedConversation : Conversation = {
                    conversation with
                    lastMessageAt = ?now;
                    unreadCount = Array.map<(Principal, Nat), (Principal, Nat)>(conversation.unreadCount, func((userId, count)) {
                        if (userId == receiverId) {
                            (userId, count + 1)
                        } else {
                            (userId, count)
                        }
                    });
                };
                
                conversations.put(conversationId, updatedConversation);
                
                return #ok(newMessage);
            };
            case (null) {
                return #err("Conversation not found");
            };
        };
    };

    // Get user's conversations
    public shared query(msg) func getMyConversations() : async Result<[ConversationSummary]> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        switch (userConversations.get(caller)) {
            case (?conversationIds) {
                let summaries = Buffer.Buffer<ConversationSummary>(conversationIds.size());
                
                for (conversationId in conversationIds.vals()) {
                    switch (conversations.get(conversationId)) {
                        case (?conversation) {
                            let lastMessage = getLastMessage(conversationId);
                            let summary : ConversationSummary = {
                                conversation = conversation;
                                lastMessage = lastMessage;
                            };
                            summaries.add(summary);
                        };
                        case (null) {
                            // Skip invalid conversation
                        };
                    };
                };
                
                return #ok(Buffer.toArray(summaries));
            };
            case (null) {
                return #ok([]);
            };
        };
    };

    // Get messages for a conversation (with pagination)
    public shared query(msg) func getConversationMessages(
        conversationId : Text,
        limit : Nat,
        offset : Nat
    ) : async Result<MessagePage> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        switch (conversations.get(conversationId)) {
            case (?conversation) {
                if (caller != conversation.clientId and caller != conversation.providerId) {
                    return #err("Unauthorized to view this conversation");
                };

                switch (conversationMessages.get(conversationId)) {
                    case (?messageIds) {
                        let totalMessages = messageIds.size();
                        let endIndex = if (offset + limit > totalMessages) totalMessages else offset + limit;
                        let hasMore = endIndex < totalMessages;
                        
                        let pageMessages = Buffer.Buffer<Message>(limit);
                        var index = offset;
                        
                        while (index < endIndex) {
                            let messageId = messageIds[index];
                            switch (messages.get(messageId)) {
                                case (?message) {
                                    // Decrypt message for authorized user
                                    let decryptedContent = decryptMessage(message.content);
                                    let decryptedMessage : Message = {
                                        message with
                                        content = {
                                            encryptedText = decryptedContent;
                                            encryptionKey = "";
                                        };
                                    };
                                    pageMessages.add(decryptedMessage);
                                };
                                case (null) {
                                    // Skip invalid message
                                };
                            };
                            index += 1;
                        };
                        
                        let nextPageToken = if (hasMore) ?Nat.toText(endIndex) else null;
                        
                        let messagePage : MessagePage = {
                            messages = Buffer.toArray(pageMessages);
                            hasMore = hasMore;
                            nextPageToken = nextPageToken;
                        };
                        
                        return #ok(messagePage);
                    };
                    case (null) {
                        let emptyPage : MessagePage = {
                            messages = [];
                            hasMore = false;
                            nextPageToken = null;
                        };
                        return #ok(emptyPage);
                    };
                };
            };
            case (null) {
                return #err("Conversation not found");
            };
        };
    };

    // Mark messages as read
    public shared(msg) func markMessagesAsRead(conversationId : Text) : async Result<Bool> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        switch (conversations.get(conversationId)) {
            case (?conversation) {
                if (caller != conversation.clientId and caller != conversation.providerId) {
                    return #err("Unauthorized to mark messages in this conversation");
                };

                // Reset unread count for the caller
                let updatedConversation : Conversation = {
                    conversation with
                    unreadCount = Array.map<(Principal, Nat), (Principal, Nat)>(conversation.unreadCount, func((userId, count)) {
                        if (userId == caller) {
                            (userId, 0)
                        } else {
                            (userId, count)
                        }
                    });
                };
                
                conversations.put(conversationId, updatedConversation);
                
                return #ok(true);
            };
            case (null) {
                return #err("Conversation not found");
            };
        };
    };

    // Helper function to get last message
    private func getLastMessage(conversationId : Text) : ?Message {
        switch (conversationMessages.get(conversationId)) {
            case (?messageIds) {
                if (messageIds.size() > 0) {
                    let lastMessageId = messageIds[messageIds.size() - 1];
                    messages.get(lastMessageId)
                } else {
                    null
                }
            };
            case (null) {
                null
            };
        };
    };

    // Get conversation by ID (for authorized users)
    public shared query(msg) func getConversation(conversationId : Text) : async Result<Conversation> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        switch (conversations.get(conversationId)) {
            case (?conversation) {
                if (caller != conversation.clientId and caller != conversation.providerId) {
                    return #err("Unauthorized to view this conversation");
                };
                return #ok(conversation);
            };
            case (null) {
                return #err("Conversation not found");
            };
        };
    };

    // Delete all chats for a user (for account deletion)
    public shared(msg) func deleteUserChats(userId : Principal) : async Result<Text> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };
        
        // In production, verify caller is admin
        var deletedConversations : Nat = 0;
        var deletedMessages : Nat = 0;
        
        // Delete all conversations involving this user
        let allConversations = Iter.toArray(conversations.entries());
        for ((conversationId, conversation) in allConversations.vals()) {
            if (conversation.clientId == userId or conversation.providerId == userId) {
                conversations.delete(conversationId);
                deletedConversations += 1;
                
                // Delete messages in this conversation
                let allMessages = Iter.toArray(messages.entries());
                for ((messageId, message) in allMessages.vals()) {
                    if (message.conversationId == conversationId) {
                        messages.delete(messageId);
                        deletedMessages += 1;
                    };
                };
            };
        };
        
        return #ok("Deleted " # Nat.toText(deletedConversations) # " conversations and " # Nat.toText(deletedMessages) # " messages");
    };
}
