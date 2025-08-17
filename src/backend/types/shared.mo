import Principal "mo:base/Principal";
import Int "mo:base/Int";
import Time "mo:base/Time";
import List "mo:base/List";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import HashMap "mo:base/HashMap";
import Buffer "mo:base/Buffer";

module {
    // User types
    public type UserRole = {
        #Client;
        #ServiceProvider;
    };

    public type ProfileImage = {
        imageUrl: Text;
        thumbnailUrl: Text;
    };

    // Media storage types
    public type MediaType = {
        #UserProfile;
        #ServiceImage;
        #ServiceCertificate;
        #RemittancePaymentProof; // New type for GCash payment screenshots
    };

    public type MediaItem = {
        id: Text;
        ownerId: Principal;
        fileName: Text;
        fileSize: Nat;
        contentType: Text;
        mediaType: MediaType;
        filePath: Text;
        url: Text;
        thumbnailUrl: ?Text;
        createdAt: Time.Time;
        updatedAt: Time.Time;
    };

    public type MediaUploadRequest = {
        fileName: Text;
        contentType: Text;
        mediaType: MediaType;
        fileData: Blob;
    };
    // Removed Profile
    public type Profile = {
        id: Principal;
        name: Text;
        phone: Text;
        role: UserRole; // Original role when user first signed up
        activeRole: UserRole; // Current active role for UI and permissions
        createdAt: Time.Time;
        updatedAt: Time.Time;
        profilePicture: ?ProfileImage;
        biography: ?Text;
    };

    // Service types
    public type ServiceCategory = {
        id: Text;
        name: Text;
        description: Text;
        parentId: ?Text;
        slug: Text;
        imageUrl: Text;
    };

    public type Location = {
        latitude: Float;
        longitude: Float;
        address: Text;
        city: Text;
        state: Text;
        country: Text;
        postalCode: Text;
    };

    public type ServiceStatus = {
        #Available;
        #Unavailable;
        #Suspended;
    };

    // Availability types
    public type TimeSlot = {
        startTime: Text; // Format: "HH:MM" (24-hour format)
        endTime: Text;   // Format: "HH:MM" (24-hour format)
    };

    public type DayOfWeek = {
        #Monday;
        #Tuesday;
        #Wednesday;
        #Thursday;
        #Friday;
        #Saturday;
        #Sunday;
    };

    public type DayAvailability = {
        isAvailable: Bool;
        slots: [TimeSlot];
    };


    public type ProviderAvailability = {
        providerId: Principal;
        weeklySchedule: [(DayOfWeek, DayAvailability)];
        instantBookingEnabled: Bool;
        bookingNoticeHours: Nat; // Minimum hours in advance for booking
        maxBookingsPerDay: Nat;
        isActive: Bool;
        createdAt: Time.Time;
        updatedAt: Time.Time;
    };

    public type AvailableSlot = {
        date: Time.Time;
        timeSlot: TimeSlot;
        isAvailable: Bool;
        conflictingBookings: [Text]; // Booking IDs that conflict
    };

    public type ServicePackage = {
        id: Text;
        serviceId: Text;
        title: Text;
        description: Text;
        price: Nat;
        createdAt: Time.Time;
        updatedAt: Time.Time;
    };

    public type Service = {
        id: Text;
        providerId: Principal;
        title: Text;
        description: Text;
        category: ServiceCategory;
        price: Nat;
        location: Location;
        status: ServiceStatus;
        createdAt: Time.Time;
        updatedAt: Time.Time;
        rating: ?Float;
        reviewCount: Nat;
        imageUrls: [Text]; // Array of media URLs for service images (max 5)
        certificateUrls: [Text]; // Array of media URLs for service certificates
        isVerifiedService: Bool; // Service verification status based on certificates
        // Availability information
        weeklySchedule: ?[(DayOfWeek, DayAvailability)];
        instantBookingEnabled: ?Bool;
        bookingNoticeHours: ?Nat; // Minimum hours in advance for booking
        maxBookingsPerDay: ?Nat;
        // Package reference not needed as we'll use serviceId to look up packages
    };

    // Booking types
    public type BookingStatus = {
        #Requested;
        #Accepted;
        #Declined;
        #Cancelled;
        #InProgress;
        #Completed;
        #Disputed;
    };

    public type Evidence = {
        id: Text;
        bookingId: Text;
        submitterId: Principal;
        description: Text;
        fileUrls: [Text];
        qualityScore: ?Float;
        createdAt: Time.Time;
    };

    public type Booking = {
        id: Text;
        clientId: Principal;
        providerId: Principal;
        serviceId: Text;
        servicePackageId: ?Text;  // ID of the package if booking a package
        status: BookingStatus;
        requestedDate: Time.Time;
        scheduledDate: ?Time.Time;
        completedDate: ?Time.Time;
        price: Nat;
        location: Location;
        evidence: ?Evidence;
        notes: ?Text;  // Optional notes from client during booking creation
        createdAt: Time.Time;
        updatedAt: Time.Time;
    };

    // Review types
    public type ReviewStatus = {
        #Visible;
        #Hidden;
        #Flagged;
    };

    public type Review = {
        id: Text;
        bookingId: Text;
        clientId: Principal;
        providerId: Principal;
        serviceId: Text;
        rating: Nat;
        comment: Text;
        status: ReviewStatus;
        qualityScore: ?Float;
        createdAt: Time.Time;
        updatedAt: Time.Time;
    };

    // Reputation types
    public type TrustLevel = {
        #New;
        #Low;
        #Medium;
        #High;
        #VeryHigh;
    };

    public type DetectionFlag = {
        #ReviewBomb;
        #CompetitiveManipulation;
        #FakeEvidence;
        #IdentityFraud;
        #Other;
    };

    public type ReputationScore = {
        userId: Principal;
        trustScore: Float;
        trustLevel: TrustLevel;
        completedBookings: Nat;
        averageRating: ?Float;
        detectionFlags: [DetectionFlag];
        lastUpdated: Time.Time;
    };

    // Analytics types
    public type ProviderAnalytics = {
        providerId: Principal;
        completedJobs: Nat;
        cancelledJobs: Nat;
        totalJobs: Nat;
        completionRate: Float;
        totalEarnings: Nat;
        startDate: ?Time.Time;
        endDate: ?Time.Time;
        packageBreakdown: [(Text, Nat)]; // (packageId, count) pairs for package bookings
    };

    public type ClientAnalytics = {
        clientId: Principal;
        totalBookings: Nat;
        servicesCompleted: Nat;
        totalSpent: Nat; // Only from completed bookings
        memberSince: Time.Time; // From user profile creation date
        packageBreakdown: [(Text, Nat)]; // (packageId, count) pairs for package bookings
        startDate: ?Time.Time;
        endDate: ?Time.Time;
    };

    // Chat types
    public type MessageStatus = {
        #Sent;
        #Delivered;
        #Read;
    };

    public type MessageType = {
        #Text;
        #File; // Future support for file attachments
    };

    public type EncryptedContent = {
        encryptedText: Text;
        encryptionKey: Text;
    };

    public type FileAttachment = {
        fileName: Text;
        fileSize: Nat;
        fileType: Text;
        fileUrl: Text;
    };

    public type Message = {
        id: Text;
        conversationId: Text;
        senderId: Principal;
        receiverId: Principal;
        messageType: MessageType;
        content: EncryptedContent;
        attachment: ?FileAttachment;
        status: MessageStatus;
        createdAt: Time.Time;
        readAt: ?Time.Time;
    };

    public type Conversation = {
        id: Text;
        clientId: Principal;
        providerId: Principal;
        createdAt: Time.Time;
        lastMessageAt: ?Time.Time;
        isActive: Bool;
        unreadCount: [(Principal, Nat)]; // (userId, unreadCount) pairs
    };

    public type ConversationSummary = {
        conversation: Conversation;
        lastMessage: ?Message;
    };

    public type MessagePage = {
        messages: [Message];
        hasMore: Bool;
        nextPageToken: ?Text;
    };

    // API Response
    public type Result<T> = {
        #ok: T;
        #err: Text;
    };

    // HTTP types for serving media files
    public type HeaderField = (Text, Text);

    public type HttpRequest = {
        method: Text;
        url: Text;
        headers: [HeaderField];
        body: Blob;
    };

    public type HttpResponse = {
        status_code: Nat16;
        headers: [HeaderField];
        body: Blob;
    };

    // Remittance system types
    public type RemittanceOrderStatus = {
        #AwaitingPayment; // Service provider needs to make payment
        #PaymentSubmitted; // Service provider uploaded payment proof
        #PaymentValidated; // Admin validated the payment
        #Settled; // Commission confirmed and settled
        #Cancelled;
    };

    public type PaymentMethod = {
        #CashOnHand;
    };

    public type CommissionFormula = {
        #Flat: Nat; // Fixed amount in centavos
        #Percentage: Nat; // Rate in basis points (1/100 of 1%)
        #Tiered: [(Nat, Nat)]; // (up_to_amount, rate_bps) pairs
        #Hybrid: { base: Nat; rate_bps: Nat }; // Base amount + percentage
    };

    public type CommissionRule = {
        id: Text;
        version: Nat32;
        service_types: [Text]; // ServiceCategory IDs
        payment_methods: [PaymentMethod];
        formula: CommissionFormula;
        min_commission: ?Nat; // Optional minimum commission in centavos
        max_commission: ?Nat; // Optional maximum commission in centavos
        priority: Nat;
        effective_from: Time.Time;
        effective_to: ?Time.Time;
        is_active: Bool;
        created_at: Time.Time;
        updated_at: Time.Time;
    };

    public type RemittanceOrder = {
        id: Text;
        service_provider_id: Principal; // Service provider who needs to pay commission
        amount_php_centavos: Nat; // Total service amount in centavos
        service_type: Text; // ServiceCategory ID
        service_id: ?Text; // Optional reference to specific service
        booking_id: ?Text; // Optional reference to related booking
        payment_method: PaymentMethod;
        status: RemittanceOrderStatus;
        commission_rule_id: Text;
        commission_version: Nat32;
        commission_amount: Nat; // Commission in centavos
        payment_proof_media_ids: [Text]; // Media IDs for GCash payment proofs
        validated_by: ?Principal; // Admin who validated the payment
        validated_at: ?Time.Time;
        created_at: Time.Time;
        payment_submitted_at: ?Time.Time;
        settled_at: ?Time.Time;
        updated_at: Time.Time;
    };

    public type CommissionQuote = {
        rule_id: Text;
        rule_version: Nat32;
        commission: Nat; // Commission amount in centavos
        net: Nat; // Net proceeds in centavos
        effective_rate: Float; // Actual commission rate as percentage
    };

    public type SettlementInstruction = {
        corporate_gcash_account: Text;
        commission_amount: Nat;
        reference_number: Text;
        instructions: Text;
        expires_at: Time.Time;
    };

    public type RemittanceOrderFilter = {
        status: ?[RemittanceOrderStatus];
        service_provider_id: ?Principal;
        from_date: ?Time.Time;
        to_date: ?Time.Time;
    };

    public type PageRequest = {
        cursor: ?Text;
        size: Nat32;
    };

    public type RemittanceOrderPage = {
        items: [RemittanceOrder];
        next_cursor: ?Text;
        total_count: ?Nat;
    };

    public type MediaValidationSummary = {
        media_id: Text;
        sha256: ?Text;
        mime_type: Text;
        size_bytes: Nat;
        uploaded_at: Time.Time;
        extracted_timestamp: ?Time.Time;
        is_valid_type: Bool;
        is_within_size_limit: Bool;
        has_text_content: ?Bool;
        validation_flags: [Text];
    };
}