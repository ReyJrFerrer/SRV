import { BaseEntity } from "../common/base-entity";

export interface Terms extends BaseEntity {
  title: string;
  content: string;
  lastUpdated: Date;
  version: string;
  acceptanceRequired: boolean;
}
