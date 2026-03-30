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
