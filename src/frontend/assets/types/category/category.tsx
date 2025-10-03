import { BaseEntity } from "../common/base-entity";
import { Service } from "../service/service";
export interface Category extends BaseEntity {
  name: string;
  description: string;
  icon?: string;
  parentId?: string;
  // added 12/2/2025
  imageUrl: string;
  slug: string;
  services: Service[];
}
