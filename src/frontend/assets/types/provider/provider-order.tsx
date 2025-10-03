import { BaseEntity } from "../common/base-entity";
import { Order } from "../order/order";
import { OrderStatus } from "../order/order-status";
import { MediaItem } from "../common/media-item";
import { Location } from "../common/location";

export type ProviderOrderActionType =
  | "ACCEPTED"
  | "REJECTED"
  | "STARTED"
  | "ARRIVED"
  | "COMPLETED"
  | "CANCELLED"
  | "MESSAGE_SENT"
  | "LOCATION_SHARED"
  | "PHOTO_UPLOADED"
  | "EXTRA_REQUESTED"
  | "PAYMENT_CONFIRMED";

export interface ProviderOrder extends BaseEntity {
  order: Order;
  status: OrderStatus;
  clientName: string;
  clientId: string;
  clientContact: string;
  serviceTitle: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  location: Location;
  quotedPrice: number;
  finalPrice?: number;
  priceDifferenceReason?: string;
  paymentReceived: boolean;
  paymentReceivedAmount?: number;
  paymentMethod?: string;
  actions: ProviderOrderAction[];
  extraCharges: ExtraCharge[];
  penalties: OrderPenalty[];
  completionPhotos: MediaItem[];
  completionNotes?: string;
  clientRating?: number;
  clientReview?: string;
  providerReplyToReview?: string;
}

export interface ProviderOrderAction {
  id: string;
  type: ProviderOrderActionType;
  timestamp: Date;
  details?: string;
  location?: Location;
  media?: MediaItem[];
}

export interface ExtraCharge extends BaseEntity {
  orderId: string;
  description: string;
  amount: number;
  reason: string;
  approvedByClient: boolean;
  approvedAt?: Date;
}

export interface OrderPenalty extends BaseEntity {
  orderId: string;
  description: string;
  amount: number;
  reason:
    | "LATE_ARRIVAL"
    | "EARLY_DEPARTURE"
    | "CANCELLATION"
    | "NO_SHOW"
    | "OTHER";
  agreedByProvider: boolean;
  agreedAt?: Date;
  additionalNotes?: string;
}
