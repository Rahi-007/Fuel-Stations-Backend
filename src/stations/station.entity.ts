import { Entity, Property, ManyToOne, OneToMany, Index } from "@mikro-orm/core";
import { BaseSchema } from "../auth/entity/base.entity";
import { DivisionSchema } from "../location/entity/division.entity";
import { DistrictSchema } from "../location/entity/district.entity";
import { SubDistrictSchema } from "../location/entity/subDistrict.entity";
import { UserSchema } from "../auth/entity/user.entity";

/** Fuel availability status */
export enum FuelStatus {
  AVAILABLE = "available",
  OUT_OF_STOCK = "out_of_stock",
  LIMITED = "limited",
}

/** Queue status levels */
export enum QueueStatus {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

@Entity()
@Index({ properties: ['village'] })
export class StationSchema extends BaseSchema {
  @Property({ unique: true, length: 48 })
  osmRef!: string;

  @Property({ length: 255, nullable: true })
  name?: string;

  @Property({ length: 191, nullable: true })
  brand?: string;

  @Property({ columnType: 'decimal', precision: 10, scale: 7 })
  lat!: number;

  @Property({ columnType: 'decimal', precision: 10, scale: 7 })
  lng!: number;

  @ManyToOne(() => DivisionSchema, { nullable: true })
  division?: DivisionSchema;

  @ManyToOne(() => DistrictSchema, { nullable: true })
  district?: DistrictSchema;

  @ManyToOne(() => SubDistrictSchema, { nullable: true })
  subDistrict?: SubDistrictSchema;

  @Property({ length: 191, nullable: true })
  village?: string;

  @Property({ type: 'json', nullable: true })
  tags?: any;

  @Property({ length: 500, nullable: true })
  avatar?: string;

  @Property({ type: 'json', nullable: true })
  fuelTypes?: any;

  @Property({ type: 'json', nullable: true })
  prices?: any;

  @Property({ type: 'string', default: FuelStatus.OUT_OF_STOCK })
  status!: FuelStatus;

  @Property({ type: 'string', default: QueueStatus.LOW })
  queueStatus!: QueueStatus;

  @Property({ length: 10, nullable: true })
  openingTime?: string;

  @Property({ length: 500, nullable: true })
  googleMapLink?: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true })
  adminNote?: string;

  @Property({ default: 0 })
  likesCount = 0;

  @Property({ default: 0 })
  followersCount = 0;

  @ManyToOne(() => UserSchema, { nullable: true })
  lastUpdatedBy?: UserSchema;
}

export type IStation = StationSchema;

/** Station Like Schema - tracks which users liked which stations */
@Entity()
@Index({ properties: ['station', 'user'] })
export class StationLikeSchema extends BaseSchema {
  @ManyToOne(() => StationSchema)
  station!: StationSchema;

  @ManyToOne(() => UserSchema)
  user!: UserSchema;
}

export type IStationLike = StationLikeSchema;

/** Station Follow Schema - tracks which users follow which stations */
@Entity()
@Index({ properties: ['station', 'user'] })
export class StationFollowSchema extends BaseSchema {
  @ManyToOne(() => StationSchema)
  station!: StationSchema;

  @ManyToOne(() => UserSchema)
  user!: UserSchema;
}

export type IStationFollow = StationFollowSchema;

/** Comment Schema for station comments */
@Entity()
export class CommentSchema extends BaseSchema {
  @Property({ type: 'text' })
  text!: string;

  @ManyToOne(() => StationSchema)
  station!: StationSchema;

  @ManyToOne(() => UserSchema)
  user!: UserSchema;

  @ManyToOne(() => CommentSchema, { nullable: true })
  parent?: CommentSchema;
}

export type IComment = CommentSchema;
