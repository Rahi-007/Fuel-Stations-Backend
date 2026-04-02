import { defineEntity, type InferEntity, p } from "@mikro-orm/core";
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

export const StationSchema = defineEntity({
  name: "Station",
  extends: BaseSchema,
  properties: {
    // Basic Information
    osmRef: p.string().unique().length(48),
    name: p.string().nullable().length(255),
    brand: p.string().nullable().length(191),
    lat: p.double(),
    lng: p.double(),
    
    // Location Relations
    division: () => p.manyToOne(DivisionSchema).nullable(),
    district: () => p.manyToOne(DistrictSchema).nullable(),
    subDistrict: () => p.manyToOne(SubDistrictSchema).nullable(),
    village: p.string().nullable().length(191).index(),
    
    // OSM Tags
    tags: p.json().nullable(),
    
    // Avatar/Image
    avatar: p.string().nullable().length(500),
    
    // Fuel Types & Prices (stored as JSON)
    fuelTypes: p.json().nullable(),
    prices: p.json().nullable(),
    
    // Status Fields
    status: p.enum(() => FuelStatus).default(FuelStatus.AVAILABLE),
    queueStatus: p.enum(() => QueueStatus).default(QueueStatus.LOW),
    
    // Time Information
    openingTime: p.string().nullable().length(10), // Format: "08:00" or "8am"
    
    // Links & Notes
    googleMapLink: p.string().nullable().length(500),
    description: p.text().nullable(),
    adminNote: p.text().nullable(),
    
    // User Engagement - Many to Many with User (join table needed)
    // likedBy and followedBy will be implemented via separate like/follow tables
    
    // Counter Cache Fields (for performance optimization)
    likesCount: p.integer().default(0),
    followersCount: p.integer().default(0),
    
    // Audit Fields
    lastUpdatedBy: () => p.manyToOne(UserSchema).nullable(),
  },
});

export type IStation = InferEntity<typeof StationSchema>;

/** Station Like Schema - tracks which users liked which stations */
export const StationLikeSchema = defineEntity({
  name: "StationLike",
  extends: BaseSchema,
  properties: {
    station: () => p.manyToOne(StationSchema),
    user: () => p.manyToOne(UserSchema),
  },
  indexes: [
    { properties: ['station', 'user'] },
  ],
});

export type IStationLike = InferEntity<typeof StationLikeSchema>;

/** Station Follow Schema - tracks which users follow which stations */
export const StationFollowSchema = defineEntity({
  name: "StationFollow",
  extends: BaseSchema,
  properties: {
    station: () => p.manyToOne(StationSchema),
    user: () => p.manyToOne(UserSchema),
  },
  indexes: [
    { properties: ['station', 'user'] },
  ],
});
  
export type IStationFollow = InferEntity<typeof StationFollowSchema>;

/** Comment Schema for station comments */
export const CommentSchema = defineEntity({
  name: "Comment",
  extends: BaseSchema,
  properties: {
    text: p.text(),
    station: () => p.manyToOne(StationSchema),
    user: () => p.manyToOne(UserSchema), 
    parent: () => p.manyToOne(CommentSchema).nullable(),
  },
});

export type IComment = InferEntity<typeof CommentSchema>;
