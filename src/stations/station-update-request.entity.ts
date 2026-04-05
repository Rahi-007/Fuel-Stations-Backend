import { Entity, Property, ManyToOne, Enum } from "@mikro-orm/core";
import { BaseSchema } from "../auth/entity/base.entity";
import { StationSchema } from "./station.entity";
import { UserSchema } from "../auth/entity/user.entity";

/** Update request status */
export enum UpdateRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity()
export class StationUpdateRequestSchema extends BaseSchema {
  @ManyToOne(() => StationSchema)
  station!: StationSchema;

  @ManyToOne(() => UserSchema)
  requestedBy!: UserSchema;

  @Property({ type: 'json' })
  changes!: any; // JSON object containing the proposed changes

  @Enum(() => UpdateRequestStatus)
  status: UpdateRequestStatus = UpdateRequestStatus.PENDING;

  @Property({ type: 'text', nullable: true })
  adminNote?: string; // Optional note from admin when approving/rejecting

  @ManyToOne(() => UserSchema, { nullable: true })
  reviewedBy?: UserSchema; // Admin who reviewed the request

  @Property({ nullable: true })
  reviewedAt?: Date;
}

export type IStationUpdateRequest = StationUpdateRequestSchema;