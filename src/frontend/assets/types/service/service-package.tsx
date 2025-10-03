import { BaseEntity } from "../common/base-entity";

export interface Package extends BaseEntity {
  name: string;
  description: string;
  price: number;
  currency: string;
  duration?: string;
  features: string[];
  isPopular?: boolean;
}
