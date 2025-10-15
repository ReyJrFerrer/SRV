import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Int "mo:base/Int";

import Types "../types/shared";

persistent actor NotificationCanister {
    
    // Types
    public type NotificationType = {
        #booking_accepted;
        #booking_declined;
        #review_reminder;
        #generic;
        #new_booking_request;
        #booking_confirmation;
        #payment_completed;
        #service_completion_reminder;
        #review_request;
        #chat_message;
        #booking_cancelled;
        #booking_completed;
        #payment_received;
        #payment_failed;
        #provider_message;
        #system_announcement;
        #service_rescheduled;
        #service_reminder;
        #promo_offer;
        #provider_on_the_way;
        #booking_rescheduled;
        #client_no_show;
        #payment_issue;
    };

    public type UserType = {
        #client;
        #provider;
    };

    public type NotificationStatus = {
        #unread;
        #read;
        #push_sent;
        #push_sent_and_read;
    };

    public type Notification = {
        id: Text;
        userId: Principal;
        userType: UserType;
        notificationType: NotificationType;
        title: Text;
        message: Text;
        relatedEntityId: ?Text; // bookingId, serviceId, etc.
        metadata: ?Text; // JSON string for additional data
        status: NotificationStatus;
        createdAt: Int;
        readAt: ?Int;
        pushSentAt: ?Int;
        expiresAt: ?Int; // Optional expiration time
    };

    public type NotificationFilter = {
        userType: ?UserType;
        notificationType: ?NotificationType;
        status: ?NotificationStatus;
        fromDate: ?Int;
        toDate: ?Int;
        limit: ?Nat;
        offset: ?Nat;
    };

    public type PushSubscription = {
        userId: Principal;
        endpoint: Text;
        p256dh: Text;
        auth: Text;
        userAgent: ?Text;
        isActive: Bool;
        createdAt: Int;
        lastUsed: ?Int;
    };

    // Type aliases
    type Result<T> = Types.Result<T>;

    // State variables - following booking.mo pattern
    private var notificationEntries : [(Text, Notification)] = [];
    private transient var notifications = HashMap.HashMap<Text, Notification>(100, Text.equal, Text.hash);
    
    private var userNotificationEntries : [(Principal, [Text])] = [];
    private transient var userNotifications = HashMap.HashMap<Principal, [Text]>(50, Principal.equal, Principal.hash);
    
    private var pushSubscriptionEntries : [(Principal, PushSubscription)] = [];
    private transient var pushSubscriptions = HashMap.HashMap<Principal, PushSubscription>(50, Principal.equal, Principal.hash);
    
    // Spam prevention: Track notification frequency per user+type
    private transient var notificationFrequency = HashMap.HashMap<Text, [Int]>(100, Text.equal, Text.hash);
    private transient let SPAM_PREVENTION_WINDOW: Int = 300_000_000_000; // 5 minutes in nanoseconds
    private transient let MAX_NOTIFICATIONS_PER_WINDOW: Nat = 10;

    // State counters
    private var nextNotificationId: Nat = 0;

    // Admin principals who can manage notifications
    private var adminPrincipals: [Principal] = [];

    // Canister references
    private transient var bookingCanisterId : ?Principal = null;
    private transient var authCanisterId : ?Principal = null;

    // System upgrade persistence
    system func preupgrade() {
        notificationEntries := Iter.toArray(notifications.entries());
        userNotificationEntries := Iter.toArray(userNotifications.entries());
        pushSubscriptionEntries := Iter.toArray(pushSubscriptions.entries());
    };

    system func postupgrade() {
        notifications := HashMap.fromIter<Text, Notification>(notificationEntries.vals(), 100, Text.equal, Text.hash);
        notificationEntries := [];
        
        userNotifications := HashMap.fromIter<Principal, [Text]>(userNotificationEntries.vals(), 50, Principal.equal, Principal.hash);
        userNotificationEntries := [];
        
        pushSubscriptions := HashMap.fromIter<Principal, PushSubscription>(pushSubscriptionEntries.vals(), 50, Principal.equal, Principal.hash);
        pushSubscriptionEntries := [];
    };

    // Set canister references
    public shared(_msg) func setCanisterReferences(
        booking : ?Principal,
        auth : ?Principal
    ) : async Result<Text> {
        // In real implementation, need to check if caller has admin rights
        bookingCanisterId := booking;
        authCanisterId := auth;
        return #ok("Canister references set successfully");
    };

    // Helper functions
    private func generateId() : Text {
        let now = Int.abs(Time.now());
        let random = Int.abs(Time.now()) % 10000;
        return "notif_" # Int.toText(now) # "-" # Int.toText(random);
    };

    // Core notification functions
    public shared(_msg) func createNotification(
        targetUserId: Principal,
        userType: UserType,
        notificationType: NotificationType,
        title: Text,
        message: Text,
        relatedEntityId: ?Text,
        metadata: ?Text
    ): async Result.Result<Text, Text> {
        
        // Generate unique notification ID
        let notificationId = generateId();
        nextNotificationId += 1;
        
        // Check spam prevention
        let spamKey = Principal.toText(targetUserId) # "_" # debug_show(notificationType);
        switch (isSpamming(spamKey)) {
            case (true) { return #err("Notification rate limit exceeded") };
            case (false) {};
        };
        
        let now = Time.now();
        let notification: Notification = {
            id = notificationId;
            userId = targetUserId;
            userType = userType;
            notificationType = notificationType;
            title = title;
            message = message;
            relatedEntityId = relatedEntityId;
            metadata = metadata;
            status = #unread;
            createdAt = now;
            readAt = null;
            pushSentAt = null;
            expiresAt = ?(now + 2_592_000_000_000_000); // 30 days expiration
        };
        
        // Store notification
        notifications.put(notificationId, notification);
        
        // Update user notification index
        let userNotifs = switch (userNotifications.get(targetUserId)) {
            case (?existing) { Array.append(existing, [notificationId]) };
            case (null) { [notificationId] };
        };
        userNotifications.put(targetUserId, userNotifs);
        
        // Update frequency tracking
        updateNotificationFrequency(spamKey);
        
        #ok(notificationId)
    };

    // Get notifications for a user
    public query(_msg) func getUserNotifications(
        userId: Principal,
        filter: ?NotificationFilter
    ): async [Notification] {
        switch (userNotifications.get(userId)) {
            case (?notificationIds) {
                let userNotifs = Array.mapFilter<Text, Notification>(
                    notificationIds,
                    func(id: Text): ?Notification {
                        notifications.get(id)
                    }
                );
                
                // Apply filters if provided
                switch (filter) {
                    case (?f) { applyFilter(userNotifs, f) };
                    case (null) { userNotifs };
                }
            };
            case (null) { [] };
        }
    };

    // Mark notification as read
    public shared(msg) func markAsRead(notificationId: Text): async Result.Result<(), Text> {
        switch (notifications.get(notificationId)) {
            case (?notification) {
                // Verify caller owns this notification
                if (notification.userId != msg.caller) {
                    return #err("Unauthorized: You can only mark your own notifications as read");
                };
                
                let updatedNotification = {
                    notification with
                    status = switch (notification.status) {
                        case (#unread) { #read };
                        case (#push_sent) { #push_sent_and_read };
                        case (other) { other };
                    };
                    readAt = ?Time.now();
                };
                
                notifications.put(notificationId, updatedNotification);
                #ok()
            };
            case (null) { #err("Notification not found") };
        }
    };

    // Mark notification as push sent (spam prevention)
    public shared(msg) func markAsPushSent(notificationId: Text): async Result.Result<(), Text> {
        // Only allow admin or the notification owner
        if (not isAdmin(msg.caller)) {
            switch (notifications.get(notificationId)) {
                case (?notification) {
                    if (notification.userId != msg.caller) {
                        return #err("Unauthorized");
                    };
                };
                case (null) { return #err("Notification not found") };
            };
        };
        
        switch (notifications.get(notificationId)) {
            case (?notification) {
                let updatedNotification = {
                    notification with
                    status = switch (notification.status) {
                        case (#unread) { #push_sent };
                        case (#read) { #push_sent_and_read };
                        case (other) { other };
                    };
                    pushSentAt = ?Time.now();
                };
                
                notifications.put(notificationId, updatedNotification);
                #ok()
            };
            case (null) { #err("Notification not found") };
        }
    };

    // Get notifications eligible for push (not yet sent)
    public query(_msg) func getNotificationsForPush(
        userId: Principal
    ): async [Notification] {
        switch (userNotifications.get(userId)) {
            case (?notificationIds) {
                Array.mapFilter<Text, Notification>(
                    notificationIds,
                    func(id: Text): ?Notification {
                        switch (notifications.get(id)) {
                            case (?notif) {
                                if (notif.status == #unread and notif.pushSentAt == null) {
                                    ?notif
                                } else { null }
                            };
                            case (null) { null };
                        }
                    }
                )
            };
            case (null) { [] };
        }
    };

    // Push subscription management
    public shared(msg) func storePushSubscription(
        endpoint: Text,
        p256dh: Text,
        auth: Text,
        userAgent: ?Text
    ): async Result.Result<(), Text> {
        let subscription: PushSubscription = {
            userId = msg.caller;
            endpoint = endpoint;
            p256dh = p256dh;
            auth = auth;
            userAgent = userAgent;
            isActive = true;
            createdAt = Time.now();
            lastUsed = null;
        };
        
        pushSubscriptions.put(msg.caller, subscription);
        #ok()
    };

    public shared(msg) func removePushSubscription(): async Result.Result<(), Text> {
        switch (pushSubscriptions.get(msg.caller)) {
            case (?subscription) {
                let deactivatedSubscription = {
                    subscription with isActive = false
                };
                pushSubscriptions.put(msg.caller, deactivatedSubscription);
                #ok()
            };
            case (null) { #err("No push subscription found") };
        }
    };

    public query(msg) func getPushSubscription(): async ?PushSubscription {
        pushSubscriptions.get(msg.caller)
    };

    // Analytics and admin functions
    public query(_msg) func getNotificationStats(userId: Principal): async {
        total: Nat;
        unread: Nat;
        pushSent: Nat;
        read: Nat;
    } {
        switch (userNotifications.get(userId)) {
            case (?notificationIds) {
                var total = 0;
                var unread = 0;
                var pushSent = 0;
                var read = 0;
                
                for (id in notificationIds.vals()) {
                    switch (notifications.get(id)) {
                        case (?notif) {
                            total += 1;
                            switch (notif.status) {
                                case (#unread) { unread += 1 };
                                case (#read) { read += 1 };
                                case (#push_sent) { pushSent += 1 };
                                case (#push_sent_and_read) { 
                                    pushSent += 1;
                                    read += 1;
                                };
                            };
                        };
                        case (null) {};
                    };
                };
                
                { total; unread; pushSent; read }
            };
            case (null) { { total = 0; unread = 0; pushSent = 0; read = 0 } };
        }
    };

    // Bulk operations
    public shared(msg) func markAllAsRead(): async Result.Result<Nat, Text> {
        switch (userNotifications.get(msg.caller)) {
            case (?notificationIds) {
                var count = 0;
                for (id in notificationIds.vals()) {
                    switch (notifications.get(id)) {
                        case (?notification) {
                            if (notification.status == #unread or notification.status == #push_sent) {
                                let updatedNotification = {
                                    notification with
                                    status = switch (notification.status) {
                                        case (#unread) { #read };
                                        case (#push_sent) { #push_sent_and_read };
                                        case (other) { other };
                                    };
                                    readAt = ?Time.now();
                                };
                                notifications.put(id, updatedNotification);
                                count += 1;
                            };
                        };
                        case (null) {};
                    };
                };
                #ok(count)
            };
            case (null) { #ok(0) };
        }
    };

    // Cleanup expired notifications
    public shared(msg) func cleanupExpiredNotifications(): async Nat {
        if (not isAdmin(msg.caller)) {
            return 0;
        };
        
        let now = Time.now();
        var cleanedCount = 0;
        
        // Iterate through all notifications and remove expired ones
        for ((id, notification) in notifications.entries()) {
            switch (notification.expiresAt) {
                case (?expiry) {
                    if (now > expiry) {
                        notifications.delete(id);
                        // Remove from user index too
                        switch (userNotifications.get(notification.userId)) {
                            case (?userNotifs) {
                                let filtered = Array.filter<Text>(userNotifs, func(nId) { nId != id });
                                userNotifications.put(notification.userId, filtered);
                            };
                            case (null) {};
                        };
                        cleanedCount += 1;
                    };
                };
                case (null) {};
            };
        };
        
        cleanedCount
    };

    // Helper functions
    private func isSpamming(key: Text): Bool {
        let now = Time.now();
        let windowStart = now - SPAM_PREVENTION_WINDOW;
        
        // Get timestamps for this user+type combination
        switch (notificationFrequency.get(key)) {
            case (?timestamps) {
                // Count timestamps within the window
                let recentTimestamps = Array.filter<Int>(timestamps, func(t: Int): Bool { t > windowStart });
                recentTimestamps.size() >= MAX_NOTIFICATIONS_PER_WINDOW
            };
            case (null) { false };
        }
    };

    private func updateNotificationFrequency(key: Text) {
        let now = Time.now();
        let windowStart = now - SPAM_PREVENTION_WINDOW;
        
        switch (notificationFrequency.get(key)) {
            case (?timestamps) {
                // Filter out old timestamps and add new one
                let recentTimestamps = Array.filter<Int>(timestamps, func(t: Int): Bool { t > windowStart });
                let newTimestamps = Array.append<Int>(recentTimestamps, [now]);
                notificationFrequency.put(key, newTimestamps);
            };
            case (null) {
                notificationFrequency.put(key, [now]);
            };
        };
    };

    // Check if user can receive notifications (rate limiting check)
    public query(_msg) func canReceiveNotification(
        userId: Principal,
        notificationType: NotificationType
    ): async Bool {
        let spamKey = Principal.toText(userId) # "_" # debug_show(notificationType);
        not isSpamming(spamKey)
    };

    // Cleanup old notification frequency entries (admin function)
    public shared(msg) func cleanupNotificationFrequency(): async Nat {
        if (not isAdmin(msg.caller)) {
            return 0;
        };
        
        let now = Time.now();
        let windowStart = now - SPAM_PREVENTION_WINDOW;
        var cleanedCount = 0;
        
        // Clean up old entries
        for ((key, timestamps) in notificationFrequency.entries()) {
            let recentTimestamps = Array.filter<Int>(timestamps, func(t: Int): Bool { t > windowStart });
            if (recentTimestamps.size() == 0) {
                notificationFrequency.delete(key);
                cleanedCount += 1;
            } else if (recentTimestamps.size() < timestamps.size()) {
                notificationFrequency.put(key, recentTimestamps);
            };
        };
        
        cleanedCount
    };

    private func isAdmin(principal: Principal): Bool {
        Array.find<Principal>(adminPrincipals, func(p) { p == principal }) != null
    };

    private func applyFilter(notifications: [Notification], filter: NotificationFilter): [Notification] {
        var filtered = notifications;
        
        // Apply userType filter
        switch (filter.userType) {
            case (?userType) {
                filtered := Array.filter<Notification>(filtered, func(n) { n.userType == userType });
            };
            case (null) {};
        };
        
        // Apply notificationType filter
        switch (filter.notificationType) {
            case (?notifType) {
                filtered := Array.filter<Notification>(filtered, func(n) { n.notificationType == notifType });
            };
            case (null) {};
        };
        
        // Apply status filter
        switch (filter.status) {
            case (?status) {
                filtered := Array.filter<Notification>(filtered, func(n) { n.status == status });
            };
            case (null) {};
        };
        
        // Apply date filters
        switch (filter.fromDate) {
            case (?fromDate) {
                filtered := Array.filter<Notification>(filtered, func(n) { n.createdAt >= fromDate });
            };
            case (null) {};
        };
        
        switch (filter.toDate) {
            case (?toDate) {
                filtered := Array.filter<Notification>(filtered, func(n) { n.createdAt <= toDate });
            };
            case (null) {};
        };
        
        // Apply pagination
        switch (filter.offset, filter.limit) {
            case (?offset, ?limit) {
                let start = if (offset < filtered.size()) { offset } else { filtered.size() };
                let end = if (start + limit < filtered.size()) { start + limit } else { filtered.size() };
                Array.tabulate<Notification>(end - start, func(i) { filtered[start + i] });
            };
            case (?offset, null) {
                let start = if (offset < filtered.size()) { offset } else { filtered.size() };
                Array.tabulate<Notification>(filtered.size() - start, func(i) { filtered[start + i] });
            };
            case (null, ?limit) {
                let end = if (limit < filtered.size()) { limit } else { filtered.size() };
                Array.tabulate<Notification>(end, func(i) { filtered[i] });
            };
            case (null, null) { filtered };
        };
    };

    // Admin functions
    public shared(msg) func addAdmin(principal: Principal): async Result.Result<(), Text> {
        if (not isAdmin(msg.caller)) {
            return #err("Unauthorized: Only admins can add other admins");
        };
        
        adminPrincipals := Array.append(adminPrincipals, [principal]);
        #ok()
    };

    public query(_msg) func isAdminPrincipal(principal: Principal): async Bool {
        isAdmin(principal)
    };
}