export interface Booking {
  id: string;
  serviceId: string;
  serviceTitle: string;
  clientName: string;
  clientImage?: string;
  clientPhone: string;
  packageName: string;
  status:
    | "Requested"
    | "Pending"
    | "Accepted"
    | "Confirmed"
    | "InProgress"
    | "In_Progress"
    | "Completed"
    | "Cancelled"
    | "Declined";
  scheduledDate: string;
  scheduledTime: string;
  scheduledDateTime?: string;
  endDate?: string;
  location: string;
  address?: string;
  price: number;
  commission: number;
  paymentMethod: string;
  duration: string;
  notes?: string;
  createdAt: string;
  clientId?: string;
  serviceDetails?: {
    category?: {
      id: string;
      name: string;
    };
  };
}

export interface Service {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  imageUrl?: string;
  status: "Available" | "Unavailable";
  rating: number;
  reviewCount: number;
  packages: Package[];
}

export interface Package {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface Notification {
  id: string;
  type: "booking" | "rating" | "system" | "admin";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  href?: string;
}

export interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserImage?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface Transaction {
  id: string;
  type: "credit" | "debit";
  title: string;
  description: string;
  amount: number;
  timestamp: string;
}

export interface WalletBalance {
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
}

export interface ProviderProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  profileImageUrl?: string;
  bio?: string;
  location: string;
  reputationScore: number;
  trustLevel: "New" | "Building Trust" | "Reliable" | "Trusted" | "Premium";
  totalReviews: number;
  completedJobs: number;
  yearsExperience: number;
}

export interface DashboardStats {
  earningsThisMonth: number;
  completedJobs: number;
  averageRating: number;
  totalReviews: number;
  completionRate: number;
  totalEarnings: number;
  pendingRequests: number;
  upcomingJobs: number;
}

export interface ChartData {
  bookingStatus: { status: string; count: number; color: string }[];
  monthlyRevenue: { month: string; revenue: number }[];
  dailyBookings: { day: string; count: number }[];
}

// Mock Data
export const mockProfile: ProviderProfile = {
  id: "provider-1",
  name: "Juan dela Cruz",
  phone: "+63 912 345 6789",
  email: "juan@example.com",
  profileImageUrl: "https://i.pravatar.cc/150?img=68",
  bio: "Professional home services provider with over 5 years of experience.",
  location: "Quezon City, Metro Manila",
  reputationScore: 87,
  trustLevel: "Trusted",
  totalReviews: 124,
  completedJobs: 456,
  yearsExperience: 5,
};

export const mockStats: DashboardStats = {
  earningsThisMonth: 12500.0,
  completedJobs: 23,
  averageRating: 4.8,
  totalReviews: 124,
  completionRate: 94,
  totalEarnings: 156750.0,
  pendingRequests: 5,
  upcomingJobs: 8,
};

export const mockChartData: ChartData = {
  bookingStatus: [
    { status: "Accepted", count: 45, color: "#22c55e" },
    { status: "Completed", count: 120, color: "#3b82f6" },
    { status: "Pending", count: 15, color: "#facc15" },
    { status: "Cancelled", count: 8, color: "#ef4444" },
  ],
  monthlyRevenue: [
    { month: "Jan", revenue: 8500 },
    { month: "Feb", revenue: 9200 },
    { month: "Mar", revenue: 7800 },
    { month: "Apr", revenue: 11000 },
    { month: "May", revenue: 12500 },
    { month: "Jun", revenue: 14200 },
    { month: "Jul", revenue: 13800 },
    { month: "Aug", revenue: 11500 },
    { month: "Sep", revenue: 9800 },
    { month: "Oct", revenue: 13200 },
    { month: "Nov", revenue: 14500 },
    { month: "Dec", revenue: 15800 },
  ],
  dailyBookings: [
    { day: "Mon", count: 8 },
    { day: "Tue", count: 12 },
    { day: "Wed", count: 6 },
    { day: "Thu", count: 15 },
    { day: "Fri", count: 10 },
    { day: "Sat", count: 18 },
    { day: "Sun", count: 5 },
  ],
};

export const mockServices: Service[] = [
  {
    id: "service-1",
    title: "Home Cleaning Service",
    category: "Cleaning",
    categorySlug: "cleaning",
    imageUrl:
      "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=400",
    status: "Available",
    rating: 4.8,
    reviewCount: 45,
    packages: [
      {
        id: "pkg-1",
        name: "Standard Cleaning",
        price: 500,
        description: "Basic cleaning for 2-bedroom apartment",
      },
      {
        id: "pkg-2",
        name: "Deep Cleaning",
        price: 1200,
        description: "Thorough cleaning including appliances",
      },
      {
        id: "pkg-3",
        name: "Move-in/Move-out",
        price: 2000,
        description: "Complete cleaning for moving",
      },
    ],
  },
  {
    id: "service-2",
    title: "Aircon Installation & Repair",
    category: "Aircon Services",
    categorySlug: "aircon-services",
    imageUrl:
      "https://images.unsplash.com/photo-1631545806609-8daale54e037?w=400",
    status: "Available",
    rating: 4.9,
    reviewCount: 32,
    packages: [
      {
        id: "pkg-4",
        name: "Installation",
        price: 1500,
        description: "Standard window type installation",
      },
      {
        id: "pkg-5",
        name: "Repair",
        price: 800,
        description: "Diagnostic and repair service",
      },
      {
        id: "pkg-6",
        name: "Maintenance",
        price: 600,
        description: "Annual maintenance checkup",
      },
    ],
  },
  {
    id: "service-3",
    title: "Plumbing Services",
    category: "Plumbing",
    categorySlug: "plumbing",
    imageUrl:
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400",
    status: "Available",
    rating: 4.7,
    reviewCount: 28,
    packages: [
      {
        id: "pkg-7",
        name: "Pipe Repair",
        price: 400,
        description: "Fix leaking pipes",
      },
      {
        id: "pkg-8",
        name: "Drain Cleaning",
        price: 350,
        description: "Unclog drains and pipes",
      },
      {
        id: "pkg-9",
        name: "Water Heater Install",
        price: 2500,
        description: "Installation of water heater",
      },
    ],
  },
  {
    id: "service-4",
    title: "Electrical Wiring",
    category: "Electrical",
    categorySlug: "electrical",
    imageUrl:
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400",
    status: "Unavailable",
    rating: 4.6,
    reviewCount: 19,
    packages: [
      {
        id: "pkg-10",
        name: "Wiring Installation",
        price: 2000,
        description: "New electrical wiring",
      },
      {
        id: "pkg-11",
        name: "Outlet Installation",
        price: 300,
        description: "Add new electrical outlet",
      },
    ],
  },
];

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date(today);
dayAfter.setDate(dayAfter.getDate() + 2);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const formatDateTimeISO = (d: Date) => d.toISOString();

export const mockBookings: Booking[] = [
  {
    id: "booking-1",
    serviceId: "service-1",
    serviceTitle: "Home Cleaning Service",
    clientName: "Maria Santos",
    clientImage: "https://i.pravatar.cc/150?img=1",
    clientPhone: "+63 917 123 4567",
    packageName: "Deep Cleaning",
    status: "Requested",
    scheduledDate: formatDate(today),
    scheduledTime: "09:00 AM",
    scheduledDateTime: formatDateTimeISO(today),
    location: "123 Makati Avenue, Makati City",
    address: "123 Makati Avenue, Makati City",
    price: 1200,
    commission: 120,
    paymentMethod: "Cash on Hand",
    duration: "4 hours",
    notes: "Please bring your own cleaning supplies.",
    createdAt: "2026-03-29T10:30:00Z",
    clientId: "client-1",
    serviceDetails: { category: { id: "cat-1", name: "Cleaning" } },
  },
  {
    id: "booking-2",
    serviceId: "service-1",
    serviceTitle: "Home Cleaning Service",
    clientName: "Pedro Garcia",
    clientImage: "https://i.pravatar.cc/150?img=3",
    clientPhone: "+63 918 234 5678",
    packageName: "Standard Cleaning",
    status: "Confirmed",
    scheduledDate: formatDate(tomorrow),
    scheduledTime: "02:00 PM",
    scheduledDateTime: formatDateTimeISO(tomorrow),
    location: "456 Taft Avenue, Manila",
    address: "456 Taft Avenue, Manila",
    price: 500,
    commission: 50,
    paymentMethod: "GCash",
    duration: "2 hours",
    createdAt: "2026-03-28T14:20:00Z",
    clientId: "client-2",
    serviceDetails: { category: { id: "cat-1", name: "Cleaning" } },
  },
  {
    id: "booking-3",
    serviceId: "service-2",
    serviceTitle: "Aircon Installation & Repair",
    clientName: "Ana Reyes",
    clientImage: "https://i.pravatar.cc/150?img=5",
    clientPhone: "+63 919 345 6789",
    packageName: "Installation",
    status: "InProgress",
    scheduledDate: formatDate(today),
    scheduledTime: "10:00 AM",
    scheduledDateTime: formatDateTimeISO(today),
    endDate: formatDate(today),
    location: "789 EDSA, Quezon City",
    address: "789 EDSA, Quezon City",
    price: 1500,
    commission: 150,
    paymentMethod: "Cash on Hand",
    duration: "3 hours",
    createdAt: "2026-03-25T09:15:00Z",
    clientId: "client-3",
    serviceDetails: { category: { id: "cat-2", name: "Aircon Services" } },
  },
  {
    id: "booking-4",
    serviceId: "service-1",
    serviceTitle: "Home Cleaning Service",
    clientName: "Jose Cruz",
    clientImage: "https://i.pravatar.cc/150?img=7",
    clientPhone: "+63 916 456 7890",
    packageName: "Move-in/Move-out",
    status: "Completed",
    scheduledDate: formatDate(nextWeek),
    scheduledTime: "08:00 AM",
    scheduledDateTime: formatDateTimeISO(nextWeek),
    endDate: formatDate(nextWeek),
    location: "321 Bonifacio Ave, Taguig",
    address: "321 Bonifacio Ave, Taguig",
    price: 2000,
    commission: 200,
    paymentMethod: "GCash",
    duration: "6 hours",
    notes: "Great service! Will book again.",
    createdAt: "2026-03-20T11:00:00Z",
    clientId: "client-4",
    serviceDetails: { category: { id: "cat-1", name: "Cleaning" } },
  },
  {
    id: "booking-5",
    serviceId: "service-3",
    serviceTitle: "Plumbing Services",
    clientName: "Lisa Martinez",
    clientImage: "https://i.pravatar.cc/150?img=9",
    clientPhone: "+63 915 567 8901",
    packageName: "Pipe Repair",
    status: "Declined",
    scheduledDate: formatDate(dayAfter),
    scheduledTime: "03:00 PM",
    scheduledDateTime: formatDateTimeISO(dayAfter),
    location: "654 Aurora Blvd, Quezon City",
    address: "654 Aurora Blvd, Quezon City",
    price: 400,
    commission: 40,
    paymentMethod: "Cash on Hand",
    duration: "1 hour",
    notes: "Client cancelled due to scheduling conflict.",
    createdAt: "2026-03-22T16:45:00Z",
    clientId: "client-5",
    serviceDetails: { category: { id: "cat-3", name: "Plumbing" } },
  },
  {
    id: "booking-6",
    serviceId: "service-2",
    serviceTitle: "Aircon Installation & Repair",
    clientName: "Miguel Flores",
    clientImage: "https://i.pravatar.cc/150?img=11",
    clientPhone: "+63 920 678 9012",
    packageName: "Maintenance",
    status: "Accepted",
    scheduledDate: formatDate(dayAfter),
    scheduledTime: "11:00 AM",
    scheduledDateTime: formatDateTimeISO(dayAfter),
    location: "111 Pasay Road, Pasay City",
    address: "111 Pasay Road, Pasay City",
    price: 600,
    commission: 60,
    paymentMethod: "GCash",
    duration: "2 hours",
    createdAt: "2026-03-29T08:00:00Z",
    clientId: "client-6",
    serviceDetails: { category: { id: "cat-2", name: "Aircon Services" } },
  },
];

export const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    type: "booking",
    title: "New Booking Request",
    body: "Maria Santos requested Home Cleaning Service - Deep Cleaning",
    isRead: false,
    createdAt: "2026-03-29T10:30:00Z",
    href: "/booking/booking-1",
  },
  {
    id: "notif-2",
    type: "booking",
    title: "Booking Confirmed",
    body: "Pedro Garcia confirmed your booking for Standard Cleaning",
    isRead: false,
    createdAt: "2026-03-28T15:00:00Z",
    href: "/booking/booking-2",
  },
  {
    id: "notif-3",
    type: "rating",
    title: "New Review",
    body: "Jose Cruz left you a 5-star review!",
    isRead: true,
    createdAt: "2026-03-28T18:20:00Z",
    href: "/booking/booking-4",
  },
  {
    id: "notif-4",
    type: "system",
    title: "Payment Received",
    body: "You received ₱2,000 for booking #booking-4",
    isRead: true,
    createdAt: "2026-03-28T19:00:00Z",
  },
  {
    id: "notif-5",
    type: "admin",
    title: "Account Update",
    body: "Your provider profile has been verified",
    isRead: true,
    createdAt: "2026-03-27T09:00:00Z",
  },
  {
    id: "notif-6",
    type: "booking",
    title: "Booking Cancelled",
    body: "Lisa Martinez cancelled their booking for Pipe Repair",
    isRead: true,
    createdAt: "2026-03-25T14:30:00Z",
    href: "/booking/booking-5",
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv-1",
    otherUserId: "user-1",
    otherUserName: "Maria Santos",
    otherUserImage: "https://i.pravatar.cc/150?img=1",
    lastMessage: "Sure, I will be there by 9am.",
    lastMessageTime: "10 min ago",
    unreadCount: 2,
  },
  {
    id: "conv-2",
    otherUserId: "user-2",
    otherUserName: "Pedro Garcia",
    otherUserImage: "https://i.pravatar.cc/150?img=3",
    lastMessage: "Thank you for confirming!",
    lastMessageTime: "2 hours ago",
    unreadCount: 0,
  },
  {
    id: "conv-3",
    otherUserId: "user-3",
    otherUserName: "Ana Reyes",
    otherUserImage: "https://i.pravatar.cc/150?img=5",
    lastMessage: "The aircon is working perfectly now!",
    lastMessageTime: "1 day ago",
    unreadCount: 0,
  },
];

export const mockMessages: Record<string, Message[]> = {
  "conv-1": [
    {
      id: "msg-1",
      senderId: "user-1",
      text: "Hi! I wanted to confirm the booking for tomorrow.",
      timestamp: "2026-03-29T10:00:00Z",
    },
    {
      id: "msg-2",
      senderId: "provider-1",
      text: "Hello Maria! Yes, I will be there at 9am as scheduled.",
      timestamp: "2026-03-29T10:05:00Z",
    },
    {
      id: "msg-3",
      senderId: "user-1",
      text: "Great! Should I prepare anything before you arrive?",
      timestamp: "2026-03-29T10:10:00Z",
    },
    {
      id: "msg-4",
      senderId: "provider-1",
      text: "Just make sure the area is accessible. I will bring all cleaning supplies.",
      timestamp: "2026-03-29T10:15:00Z",
    },
    {
      id: "msg-5",
      senderId: "user-1",
      text: "Sure, I will be there by 9am.",
      timestamp: "2026-03-29T10:20:00Z",
    },
  ],
  "conv-2": [
    {
      id: "msg-6",
      senderId: "user-2",
      text: "Hi! I would like to book your cleaning service.",
      timestamp: "2026-03-28T14:00:00Z",
    },
    {
      id: "msg-7",
      senderId: "provider-1",
      text: "Hello Pedro! I have available slots on April 2nd. Would that work?",
      timestamp: "2026-03-28T14:05:00Z",
    },
    {
      id: "msg-8",
      senderId: "user-2",
      text: "Yes, 2pm works for me!",
      timestamp: "2026-03-28T14:10:00Z",
    },
    {
      id: "msg-9",
      senderId: "provider-1",
      text: "Perfect! I have confirmed your booking. See you then!",
      timestamp: "2026-03-28T14:15:00Z",
    },
    {
      id: "msg-10",
      senderId: "user-2",
      text: "Thank you for confirming!",
      timestamp: "2026-03-28T14:20:00Z",
    },
  ],
};

export const mockTransactions: Transaction[] = [
  {
    id: "txn-1",
    type: "credit",
    title: "Booking Payment",
    description: "Payment for booking #booking-4",
    amount: 2000,
    timestamp: "2026-03-28T19:00:00Z",
  },
  {
    id: "txn-2",
    type: "debit",
    title: "Withdrawal",
    description: "Withdrawal to GCash",
    amount: 5000,
    timestamp: "2026-03-27T10:00:00Z",
  },
  {
    id: "txn-3",
    type: "credit",
    title: "Booking Payment",
    description: "Payment for booking #booking-3",
    amount: 1500,
    timestamp: "2026-03-26T15:30:00Z",
  },
  {
    id: "txn-4",
    type: "credit",
    title: "Booking Payment",
    description: "Payment for booking #booking-2",
    amount: 500,
    timestamp: "2026-03-25T12:00:00Z",
  },
  {
    id: "txn-5",
    type: "debit",
    title: "Withdrawal",
    description: "Withdrawal to GCash",
    amount: 3000,
    timestamp: "2026-03-24T09:00:00Z",
  },
  {
    id: "txn-6",
    type: "credit",
    title: "Booking Payment",
    description: "Payment for booking #booking-1",
    amount: 1200,
    timestamp: "2026-03-23T18:00:00Z",
  },
];

export const mockCategories = [
  { id: "cat-1", name: "Cleaning", slug: "cleaning", icon: "sparkles" },
  {
    id: "cat-2",
    name: "Aircon Services",
    slug: "aircon-services",
    icon: "snow",
  },
  { id: "cat-3", name: "Plumbing", slug: "plumbing", icon: "water" },
  { id: "cat-4", name: "Electrical", slug: "electrical", icon: "flash" },
  { id: "cat-5", name: "Carpentry", slug: "carpentry", icon: "hammer" },
  { id: "cat-6", name: "Painting", slug: "painting", icon: "color-palette" },
  { id: "cat-7", name: "Gardening", slug: "gardening", icon: "leaf" },
  {
    id: "cat-8",
    name: "Appliance Repair",
    slug: "appliance-repair",
    icon: "construct",
  },
];

export const mockReviewData = {
  averageRating: 4.8,
  totalReviews: 124,
  ratingDistribution: [
    { stars: 5, count: 98 },
    { stars: 4, count: 18 },
    { stars: 3, count: 6 },
    { stars: 2, count: 2 },
    { stars: 1, count: 0 },
  ],
  reviews: [
    {
      id: "rev-1",
      clientName: "Maria Santos",
      clientImage: "https://i.pravatar.cc/150?img=1",
      rating: 5,
      comment: "Excellent service! Very professional and thorough.",
      date: "2026-03-28",
    },
    {
      id: "rev-2",
      clientName: "Pedro Garcia",
      clientImage: "https://i.pravatar.cc/150?img=3",
      rating: 5,
      comment: "Great job! Will definitely book again.",
      date: "2026-03-25",
    },
    {
      id: "rev-3",
      clientName: "Ana Reyes",
      clientImage: "https://i.pravatar.cc/150?img=5",
      rating: 4,
      comment: "Good service, arrived on time.",
      date: "2026-03-20",
    },
  ],
};

export const mockWalletBalance: WalletBalance = {
  availableBalance: 8500.0,
  pendingBalance: 1200.0,
  totalEarnings: 156750.0,
  totalWithdrawn: 148250.0,
};

export interface ServiceReview {
  id: string;
  clientName: string;
  clientImage?: string;
  rating: number;
  comment: string;
  date: string;
  serviceTitle: string;
  packageName: string;
}

export const mockServiceReviews: ServiceReview[] = [
  {
    id: "srv-rev-1",
    clientName: "Maria Santos",
    clientImage: "https://i.pravatar.cc/150?img=1",
    rating: 5,
    comment: "Best cleaning service I've ever used!",
    date: "2026-03-28",
    serviceTitle: "Home Cleaning Service",
    packageName: "Deep Cleaning",
  },
  {
    id: "srv-rev-2",
    clientName: "Pedro Garcia",
    clientImage: "https://i.pravatar.cc/150?img=3",
    rating: 4,
    comment: "Good service, would recommend.",
    date: "2026-03-25",
    serviceTitle: "Home Cleaning Service",
    packageName: "Standard Cleaning",
  },
];

export interface PayoutMethod {
  id: string;
  type: "gcash" | "bank";
  name: string;
  accountNumber?: string;
  isDefault: boolean;
}

export const mockPayoutMethods: PayoutMethod[] = [
  {
    id: "payout-1",
    type: "gcash",
    name: "GCash",
    accountNumber: "0917***1234",
    isDefault: true,
  },
  {
    id: "payout-2",
    type: "bank",
    name: "BPI Bank",
    accountNumber: "****12345678",
    isDefault: false,
  },
];

// ==================== Client-Specific Interfaces ====================

export interface ReviewItem {
  id: string;
  clientName: string;
  clientImage?: string;
  rating: number;
  comment: string;
  date: string;
  serviceTitle?: string;
  packageName?: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { stars: number; count: number }[];
  reviews: ReviewItem[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  serviceCount: number;
  imageUrl: string;
}

export interface BookingDetail {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceImage?: string;
  providerId: string;
  providerName: string;
  providerImage?: string;
  providerPhone: string;
  clientName: string;
  clientPhone: string;
  packageName: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  endDate?: string;
  location: string;
  address?: string;
  price: number;
  commission: number;
  expectedChange?: number;
  paymentMethod: string;
  duration: string;
  notes?: string;
  createdAt: string;
  attachments?: string[];
  rated?: boolean;
  rating?: number;
}

export interface TrackingInfo {
  bookingId: string;
  providerId: string;
  providerName: string;
  providerImage?: string;
  providerPhone: string;
  status: "traveling" | "arrived" | "in_progress";
  eta: string;
  distance: string;
  latitude: number;
  longitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
}

export interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  profileImageUrl?: string;
  reputationScore: number;
  trustLevel: "New" | "Building Trust" | "Reliable" | "Trusted" | "Premium";
  totalBookings: number;
  completedBookings: number;
  totalSpent: number;
  memberSince: string;
  averageRating: number;
  totalReviews: number;
}

// ==================== Client Mock Data ====================

export const mockClientProfile: ClientProfile = {
  id: "client-1",
  name: "Juan dela Cruz",
  phone: "+63 912 345 6789",
  email: "juan@example.com",
  profileImageUrl: "https://i.pravatar.cc/150?img=68",
  reputationScore: 87,
  trustLevel: "Trusted",
  totalBookings: 48,
  completedBookings: 42,
  totalSpent: 52400,
  memberSince: "January 2025",
  averageRating: 4.8,
  totalReviews: 35,
};

export const mockDetailedBookings: BookingDetail[] = [
  {
    id: "booking-1",
    serviceId: "service-1",
    serviceTitle: "Home Cleaning Service",
    serviceImage:
      "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=400",
    providerId: "provider-1",
    providerName: "Maria Santos",
    providerImage: "https://i.pravatar.cc/150?img=1",
    providerPhone: "+63 917 123 4567",
    clientName: "Juan dela Cruz",
    clientPhone: "+63 912 345 6789",
    packageName: "Deep Cleaning",
    status: "Completed",
    scheduledDate: "Mar 28, 2026",
    scheduledTime: "09:00 AM",
    endDate: "Mar 28, 2026",
    location: "123 Makati Avenue, Makati City",
    address: "123 Makati Avenue, Makati City",
    price: 1200,
    commission: 120,
    paymentMethod: "Cash on Hand",
    duration: "4 hours",
    notes: "Please bring your own cleaning supplies.",
    createdAt: "2026-03-26T10:30:00Z",
    rated: true,
    rating: 5,
  },
  {
    id: "booking-2",
    serviceId: "service-1",
    serviceTitle: "Home Cleaning Service",
    serviceImage:
      "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=400",
    providerId: "provider-2",
    providerName: "Pedro Garcia",
    providerImage: "https://i.pravatar.cc/150?img=3",
    providerPhone: "+63 918 234 5678",
    clientName: "Juan dela Cruz",
    clientPhone: "+63 912 345 6789",
    packageName: "Standard Cleaning",
    status: "Confirmed",
    scheduledDate: "Apr 3, 2026",
    scheduledTime: "02:00 PM",
    location: "456 Taft Avenue, Manila",
    address: "456 Taft Avenue, Manila",
    price: 500,
    commission: 50,
    paymentMethod: "GCash",
    duration: "2 hours",
    createdAt: "2026-03-30T14:20:00Z",
  },
  {
    id: "booking-3",
    serviceId: "service-2",
    serviceTitle: "Aircon Installation & Repair",
    serviceImage:
      "https://images.unsplash.com/photo-1631545806609-8daale54e037?w=400",
    providerId: "provider-3",
    providerName: "Ana Reyes",
    providerImage: "https://i.pravatar.cc/150?img=5",
    providerPhone: "+63 919 345 6789",
    clientName: "Juan dela Cruz",
    clientPhone: "+63 912 345 6789",
    packageName: "Installation",
    status: "InProgress",
    scheduledDate: "Apr 2, 2026",
    scheduledTime: "10:00 AM",
    location: "789 EDSA, Quezon City",
    address: "789 EDSA, Quezon City",
    price: 1500,
    commission: 150,
    paymentMethod: "Cash on Hand",
    duration: "3 hours",
    createdAt: "2026-03-28T09:15:00Z",
  },
  {
    id: "booking-4",
    serviceId: "service-3",
    serviceTitle: "Plumbing Services",
    serviceImage:
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400",
    providerId: "provider-4",
    providerName: "Jose Cruz",
    providerImage: "https://i.pravatar.cc/150?img=7",
    providerPhone: "+63 916 456 7890",
    clientName: "Juan dela Cruz",
    clientPhone: "+63 912 345 6789",
    packageName: "Pipe Repair",
    status: "Pending",
    scheduledDate: "Apr 5, 2026",
    scheduledTime: "03:00 PM",
    location: "321 Bonifacio Ave, Taguig",
    address: "321 Bonifacio Ave, Taguig",
    price: 400,
    commission: 40,
    paymentMethod: "Cash on Hand",
    duration: "1 hour",
    createdAt: "2026-04-01T16:45:00Z",
  },
  {
    id: "booking-5",
    serviceId: "service-2",
    serviceTitle: "Aircon Installation & Repair",
    serviceImage:
      "https://images.unsplash.com/photo-1631545806609-8daale54e037?w=400",
    providerId: "provider-5",
    providerName: "Lisa Martinez",
    providerImage: "https://i.pravatar.cc/150?img=9",
    providerPhone: "+63 915 567 8901",
    clientName: "Juan dela Cruz",
    clientPhone: "+63 912 345 6789",
    packageName: "Maintenance",
    status: "Cancelled",
    scheduledDate: "Mar 25, 2026",
    scheduledTime: "11:00 AM",
    location: "654 Aurora Blvd, Quezon City",
    address: "654 Aurora Blvd, Quezon City",
    price: 600,
    commission: 60,
    paymentMethod: "GCash",
    duration: "2 hours",
    createdAt: "2026-03-22T08:00:00Z",
  },
  {
    id: "booking-6",
    serviceId: "service-1",
    serviceTitle: "Home Cleaning Service",
    serviceImage:
      "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=400",
    providerId: "provider-1",
    providerName: "Maria Santos",
    providerImage: "https://i.pravatar.cc/150?img=1",
    providerPhone: "+63 917 123 4567",
    clientName: "Juan dela Cruz",
    clientPhone: "+63 912 345 6789",
    packageName: "Move-in/Move-out",
    status: "Requested",
    scheduledDate: "Apr 8, 2026",
    scheduledTime: "08:00 AM",
    location: "111 Pasay Road, Pasay City",
    address: "111 Pasay Road, Pasay City",
    price: 2000,
    commission: 200,
    paymentMethod: "SRVWallet",
    duration: "6 hours",
    notes: "Need thorough cleaning for new apartment.",
    createdAt: "2026-04-01T11:00:00Z",
  },
];

export const mockClientReviews: ReviewStats = {
  averageRating: 4.8,
  totalReviews: 35,
  ratingDistribution: [
    { stars: 5, count: 25 },
    { stars: 4, count: 7 },
    { stars: 3, count: 2 },
    { stars: 2, count: 1 },
    { stars: 1, count: 0 },
  ],
  reviews: [
    {
      id: "cr-1",
      clientName: "Maria Santos",
      clientImage: "https://i.pravatar.cc/150?img=1",
      rating: 5,
      comment: "Very punctual and professional. House was spotless!",
      date: "2026-03-28",
      serviceTitle: "Home Cleaning Service",
      packageName: "Deep Cleaning",
    },
    {
      id: "cr-2",
      clientName: "Ana Reyes",
      clientImage: "https://i.pravatar.cc/150?img=5",
      rating: 5,
      comment: "Great communication and excellent work quality.",
      date: "2026-03-25",
      serviceTitle: "Aircon Installation & Repair",
      packageName: "Installation",
    },
    {
      id: "cr-3",
      clientName: "Pedro Garcia",
      clientImage: "https://i.pravatar.cc/150?img=3",
      rating: 4,
      comment: "Good service, arrived on time. Would recommend.",
      date: "2026-03-20",
      serviceTitle: "Home Cleaning Service",
      packageName: "Standard Cleaning",
    },
    {
      id: "cr-4",
      clientName: "Jose Cruz",
      clientImage: "https://i.pravatar.cc/150?img=7",
      rating: 5,
      comment: "Best service provider I've used. Very thorough!",
      date: "2026-03-15",
      serviceTitle: "Plumbing Services",
      packageName: "Pipe Repair",
    },
    {
      id: "cr-5",
      clientName: "Lisa Martinez",
      clientImage: "https://i.pravatar.cc/150?img=9",
      rating: 4,
      comment: "Reliable and friendly. Will book again.",
      date: "2026-03-10",
      serviceTitle: "Electrical Wiring",
      packageName: "Outlet Installation",
    },
  ],
};

export const mockDetailedCategories: Category[] = [
  {
    id: "cat-1",
    name: "Cleaning",
    slug: "cleaning",
    icon: "sparkles",
    serviceCount: 24,
    imageUrl:
      "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=400",
  },
  {
    id: "cat-2",
    name: "Aircon Services",
    slug: "aircon-services",
    icon: "snow",
    serviceCount: 18,
    imageUrl:
      "https://images.unsplash.com/photo-1631545806609-8daale54e037?w=400",
  },
  {
    id: "cat-3",
    name: "Plumbing",
    slug: "plumbing",
    icon: "water",
    serviceCount: 15,
    imageUrl:
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400",
  },
  {
    id: "cat-4",
    name: "Electrical",
    slug: "electrical",
    icon: "flash",
    serviceCount: 12,
    imageUrl:
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400",
  },
  {
    id: "cat-5",
    name: "Carpentry",
    slug: "carpentry",
    icon: "hammer",
    serviceCount: 9,
    imageUrl:
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400",
  },
  {
    id: "cat-6",
    name: "Painting",
    slug: "painting",
    icon: "color-palette",
    serviceCount: 11,
    imageUrl: "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400",
  },
  {
    id: "cat-7",
    name: "Gardening",
    slug: "gardening",
    icon: "leaf",
    serviceCount: 7,
    imageUrl:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400",
  },
  {
    id: "cat-8",
    name: "Appliance Repair",
    slug: "appliance-repair",
    icon: "construct",
    serviceCount: 14,
    imageUrl:
      "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400",
  },
];

export const mockTrackingData: TrackingInfo = {
  bookingId: "booking-3",
  providerId: "provider-3",
  providerName: "Ana Reyes",
  providerImage: "https://i.pravatar.cc/150?img=5",
  providerPhone: "+63 919 345 6789",
  status: "traveling",
  eta: "15 min",
  distance: "3.2 km",
  latitude: 14.5995,
  longitude: 120.9842,
  destinationLatitude: 14.6042,
  destinationLongitude: 120.9823,
};

export const mockProviderServices: Service[] = [
  {
    id: "ps-1",
    title: "Home Cleaning Service",
    category: "Cleaning",
    categorySlug: "cleaning",
    imageUrl:
      "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=400",
    status: "Available",
    rating: 4.8,
    reviewCount: 45,
    packages: [
      {
        id: "psp-1",
        name: "Standard Cleaning",
        price: 500,
        description: "Basic cleaning for 2-bedroom apartment",
      },
      {
        id: "psp-2",
        name: "Deep Cleaning",
        price: 1200,
        description: "Thorough cleaning including appliances",
      },
      {
        id: "psp-3",
        name: "Move-in/Move-out",
        price: 2000,
        description: "Complete cleaning for moving",
      },
    ],
  },
  {
    id: "ps-2",
    title: "Office Cleaning Service",
    category: "Cleaning",
    categorySlug: "cleaning",
    imageUrl:
      "https://images.unsplash.com/photo-1527515637462-cee1e8899b90?w=400",
    status: "Available",
    rating: 4.6,
    reviewCount: 22,
    packages: [
      {
        id: "psp-4",
        name: "Small Office",
        price: 800,
        description: "Cleaning for offices up to 50sqm",
      },
      {
        id: "psp-5",
        name: "Large Office",
        price: 1800,
        description: "Cleaning for offices up to 200sqm",
      },
    ],
  },
  {
    id: "ps-3",
    title: "Carpet Cleaning",
    category: "Cleaning",
    categorySlug: "cleaning",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400",
    status: "Available",
    rating: 4.9,
    reviewCount: 18,
    packages: [
      {
        id: "psp-6",
        name: "Per Room",
        price: 350,
        description: "Standard carpet cleaning per room",
      },
      {
        id: "psp-7",
        name: "Whole House",
        price: 1500,
        description: "Full house carpet deep clean",
      },
    ],
  },
  {
    id: "ps-4",
    title: "Sofa Cleaning",
    category: "Cleaning",
    categorySlug: "cleaning",
    imageUrl:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400",
    status: "Available",
    rating: 4.7,
    reviewCount: 31,
    packages: [
      {
        id: "psp-8",
        name: "3-Seater Sofa",
        price: 600,
        description: "Deep clean for standard 3-seater",
      },
      {
        id: "psp-9",
        name: "L-Shaped Sofa",
        price: 900,
        description: "Deep clean for L-shaped sectional",
      },
    ],
  },
];

export const mockNotificationsDetailed: Notification[] = [
  {
    id: "notif-1",
    type: "booking",
    title: "Booking Confirmed",
    body: "Your booking for Home Cleaning - Deep Cleaning has been confirmed by Maria Santos",
    isRead: false,
    createdAt: "2026-04-02T10:30:00Z",
    href: "/booking/booking-1",
  },
  {
    id: "notif-2",
    type: "booking",
    title: "Provider On The Way",
    body: "Ana Reyes is heading to your location for Aircon Installation",
    isRead: false,
    createdAt: "2026-04-02T09:15:00Z",
    href: "/tracking/booking-3",
  },
  {
    id: "notif-3",
    type: "rating",
    title: "Rate Your Experience",
    body: "How was your Home Cleaning Service with Maria Santos?",
    isRead: false,
    createdAt: "2026-04-01T18:20:00Z",
    href: "/review/booking-1",
  },
  {
    id: "notif-4",
    type: "system",
    title: "Payment Received",
    body: "Your GCash payment of ₱500 has been processed successfully",
    isRead: true,
    createdAt: "2026-03-30T14:00:00Z",
  },
  {
    id: "notif-5",
    type: "booking",
    title: "Booking Completed",
    body: "Your Home Cleaning Service has been completed. Don't forget to leave a review!",
    isRead: true,
    createdAt: "2026-03-28T15:30:00Z",
    href: "/booking/booking-1",
  },
  {
    id: "notif-6",
    type: "admin",
    title: "Welcome to SRV!",
    body: "Thank you for joining SRV. Start browsing services to book your first appointment.",
    isRead: true,
    createdAt: "2026-03-20T09:00:00Z",
  },
  {
    id: "notif-7",
    type: "booking",
    title: "Booking Reminder",
    body: "Your Standard Cleaning appointment with Pedro Garcia is tomorrow at 2:00 PM",
    isRead: true,
    createdAt: "2026-03-29T20:00:00Z",
    href: "/booking/booking-2",
  },
  {
    id: "notif-8",
    type: "system",
    title: "New Feature: SRVWallet",
    body: "You can now use SRVWallet for faster payments. Top up your wallet today!",
    isRead: true,
    createdAt: "2026-03-25T12:00:00Z",
  },
];

// ==================== Provider Page Mock Data ====================

export interface ReputationBreakdown {
  score: number;
  level: "New" | "Building Trust" | "Reliable" | "Trusted" | "Premium";
  totalBookings: number;
  completedBookings: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  completionRate: number;
}

export interface TicketCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface PayoutFormData {
  gcashNumber: string;
  gcashName: string;
  businessName: string;
  businessType: "INDIVIDUAL" | "CORPORATION" | "PARTNERSHIP";
  email: string;
  phoneNumber: string;
}

export interface ReceiptData {
  bookingId: string;
  dateCompleted: string;
  serviceTitle: string;
  packageName: string;
  clientName: string;
  duration: string;
  price: number;
  commission: number;
  amountPaid: number;
  paymentMethod: string;
  changeGiven: number;
}

export interface ServiceDetail {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  description: string;
  imageUrls: string[];
  certificateUrls: string[];
  status: "Available" | "Unavailable";
  rating: number;
  reviewCount: number;
  packages: Package[];
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  weeklySchedule: {
    day: string;
    isAvailable: boolean;
    slots: { start: string; end: string }[];
  }[];
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ReviewDetailed {
  id: string;
  clientName: string;
  clientImage?: string;
  rating: number;
  comment: string;
  date: string;
  serviceTitle: string;
  packageName: string;
  qualityScore: number;
  status: "Visible" | "Hidden" | "Flagged";
}

export const mockReputationBreakdown: ReputationBreakdown = {
  score: 87,
  level: "Trusted",
  totalBookings: 456,
  completedBookings: 429,
  averageRating: 4.8,
  totalReviews: 124,
  responseRate: 96,
  completionRate: 94,
};

export const mockTicketCategories: TicketCategory[] = [
  {
    id: "technical",
    name: "Technical Issue",
    description: "App crashes, bugs, or performance problems",
    icon: "construct-outline",
  },
  {
    id: "billing",
    name: "Billing & Payments",
    description: "Payment issues, refunds, or wallet concerns",
    icon: "card-outline",
  },
  {
    id: "account",
    name: "Account Problem",
    description: "Login, profile, or verification issues",
    icon: "person-circle-outline",
  },
  {
    id: "service",
    name: "Service Concern",
    description: "Issues with bookings or service delivery",
    icon: "briefcase-outline",
  },
  {
    id: "other",
    name: "Other",
    description: "General feedback or other concerns",
    icon: "help-circle-outline",
  },
];

export const mockPayoutForm: PayoutFormData = {
  gcashNumber: "",
  gcashName: "",
  businessName: "",
  businessType: "INDIVIDUAL",
  email: "juan@example.com",
  phoneNumber: "+63 912 345 6789",
};

export const mockReceiptData: ReceiptData[] = [
  {
    bookingId: "booking-1",
    dateCompleted: "Mar 28, 2026",
    serviceTitle: "Home Cleaning Service",
    packageName: "Deep Cleaning",
    clientName: "Maria Santos",
    duration: "4 hours",
    price: 1200,
    commission: 120,
    amountPaid: 1200,
    paymentMethod: "Cash on Hand",
    changeGiven: 0,
  },
  {
    bookingId: "booking-2",
    dateCompleted: "Mar 27, 2026",
    serviceTitle: "Aircon Installation & Repair",
    packageName: "Repair",
    clientName: "Pedro Garcia",
    duration: "2 hours",
    price: 800,
    commission: 80,
    amountPaid: 1000,
    paymentMethod: "Cash on Hand",
    changeGiven: 200,
  },
  {
    bookingId: "booking-3",
    dateCompleted: "Mar 25, 2026",
    serviceTitle: "Plumbing Services",
    packageName: "Standard Repair",
    clientName: "Ana Reyes",
    duration: "1.5 hours",
    price: 600,
    commission: 60,
    amountPaid: 600,
    paymentMethod: "GCash",
    changeGiven: 0,
  },
];

export const mockServiceCategories: ServiceCategory[] = [
  { id: "cat-1", name: "Cleaning", slug: "cleaning" },
  { id: "cat-2", name: "Aircon Services", slug: "aircon-services" },
  { id: "cat-3", name: "Plumbing", slug: "plumbing" },
  { id: "cat-4", name: "Electrical", slug: "electrical" },
  { id: "cat-5", name: "Painting", slug: "painting" },
  { id: "cat-6", name: "Carpentry", slug: "carpentry" },
  { id: "cat-7", name: "Pest Control", slug: "pest-control" },
  { id: "cat-8", name: "Gardening", slug: "gardening" },
];

export const mockServiceDetail: ServiceDetail = {
  id: "service-1",
  title: "Home Cleaning Service",
  category: "Cleaning",
  categorySlug: "cleaning",
  description:
    "Professional home cleaning service for apartments, houses, and condos. We bring our own eco-friendly cleaning supplies and equipment.",
  imageUrls: [
    "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=400",
    "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400",
  ],
  certificateUrls: [
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200",
    "https://images.unsplash.com/photo-1450101499163-c8848e66ad74?w=200",
  ],
  status: "Available",
  rating: 4.8,
  reviewCount: 45,
  packages: [
    {
      id: "pkg-1",
      name: "Standard Cleaning",
      price: 500,
      description: "Basic cleaning for 2-bedroom apartment",
    },
    {
      id: "pkg-2",
      name: "Deep Cleaning",
      price: 1200,
      description: "Thorough cleaning including appliances",
    },
    {
      id: "pkg-3",
      name: "Move-in/Move-out",
      price: 2000,
      description: "Complete cleaning for moving",
    },
  ],
  location: {
    address: "123 Quezon Avenue, Quezon City, Metro Manila",
    latitude: 14.6488,
    longitude: 121.0509,
  },
  weeklySchedule: [
    {
      day: "Monday",
      isAvailable: true,
      slots: [{ start: "8:00 AM", end: "5:00 PM" }],
    },
    {
      day: "Tuesday",
      isAvailable: true,
      slots: [{ start: "8:00 AM", end: "5:00 PM" }],
    },
    {
      day: "Wednesday",
      isAvailable: true,
      slots: [{ start: "8:00 AM", end: "5:00 PM" }],
    },
    {
      day: "Thursday",
      isAvailable: true,
      slots: [{ start: "8:00 AM", end: "5:00 PM" }],
    },
    {
      day: "Friday",
      isAvailable: true,
      slots: [{ start: "8:00 AM", end: "5:00 PM" }],
    },
    {
      day: "Saturday",
      isAvailable: true,
      slots: [{ start: "9:00 AM", end: "3:00 PM" }],
    },
    { day: "Sunday", isAvailable: false, slots: [] },
  ],
};

export const mockReviewsDetailed: ReviewDetailed[] = [
  {
    id: "rev-1",
    clientName: "Maria Santos",
    clientImage: "https://i.pravatar.cc/150?img=1",
    rating: 5,
    comment:
      "Absolutely fantastic service! The cleaning was thorough and the team was very professional. Will definitely book again.",
    date: "2026-03-28",
    serviceTitle: "Home Cleaning Service",
    packageName: "Deep Cleaning",
    qualityScore: 98,
    status: "Visible",
  },
  {
    id: "rev-2",
    clientName: "Pedro Garcia",
    clientImage: "https://i.pravatar.cc/150?img=3",
    rating: 4,
    comment:
      "Good service overall. Arrived on time and did a decent job. Could improve on attention to detail in the kitchen area.",
    date: "2026-03-25",
    serviceTitle: "Home Cleaning Service",
    packageName: "Standard Cleaning",
    qualityScore: 85,
    status: "Visible",
  },
  {
    id: "rev-3",
    clientName: "Ana Reyes",
    clientImage: "https://i.pravatar.cc/150?img=5",
    rating: 5,
    comment:
      "Best cleaning service in Metro Manila! They even cleaned areas I didn't expect. Highly recommended!",
    date: "2026-03-20",
    serviceTitle: "Home Cleaning Service",
    packageName: "Move-in/Move-out",
    qualityScore: 100,
    status: "Visible",
  },
  {
    id: "rev-4",
    clientName: "Carlos Mendoza",
    clientImage: "https://i.pravatar.cc/150?img=7",
    rating: 3,
    comment:
      "Average service. The cleaning was okay but they missed some spots under the furniture.",
    date: "2026-03-15",
    serviceTitle: "Home Cleaning Service",
    packageName: "Standard Cleaning",
    qualityScore: 65,
    status: "Visible",
  },
  {
    id: "rev-5",
    clientName: "Lisa Tan",
    clientImage: "https://i.pravatar.cc/150?img=9",
    rating: 5,
    comment:
      "Superb! My apartment has never been this clean. The team was punctual, friendly, and very thorough.",
    date: "2026-03-10",
    serviceTitle: "Home Cleaning Service",
    packageName: "Deep Cleaning",
    qualityScore: 95,
    status: "Visible",
  },
];

export const mockDirectionsBooking = {
  bookingId: "booking-accept-1",
  clientName: "Maria Santos",
  clientPhone: "+63 917 123 4567",
  serviceTitle: "Home Cleaning Service",
  packageName: "Deep Cleaning",
  scheduledDate: "Apr 2, 2026",
  scheduledTime: "2:00 PM",
  price: 1200,
  paymentMethod: "Cash on Hand",
  status: "Accepted" as const,
  location: {
    address: "456 Ayala Avenue, Makati City, Metro Manila",
    latitude: 14.5547,
    longitude: 121.0244,
  },
  providerLocation: {
    latitude: 14.6091,
    longitude: 121.0223,
  },
};
