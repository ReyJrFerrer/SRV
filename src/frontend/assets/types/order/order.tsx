import { BaseEntity } from "../common/base-entity";
import { OrderStatus } from "./order-status";
import { OrderSchedule } from "./order-schedule";
import { ServicePayment } from "../payment/service-payments";
import { ServiceCompletion } from "../completion/service-completion";
import { Dispute } from "../dispute/dispute";
import { Rating } from "../common/rating";
import { Location } from "../common/location";

export interface Order extends BaseEntity {
  serviceId: string;
  clientId: string;
  providerId: string;
  status: OrderStatus;
  schedule: OrderSchedule;
  location: Location;
  payment: ServicePayment;
  completion: ServiceCompletion;
  dispute?: Dispute;
  rating?: Rating;
}
