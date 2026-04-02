import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsObject,
  IsDate,
  IsLatitude,
  IsLongitude,
  Min,
  Max,
  ValidateNested,
  IsEnum,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";
import { FuelStatus, QueueStatus } from "./station.entity";

/** DTO for fuel types with proper validation */
export class FuelTypesDto {
  @Expose()
  @IsBoolean()
  @ApiProperty({ example: true })
  petrol!: boolean;

  @Expose()
  @IsBoolean()
  @ApiProperty({ example: true })
  octane!: boolean;

  @Expose()
  @IsBoolean()
  @ApiProperty({ example: false })
  diesel!: boolean;
}

/** DTO for fuel prices with proper validation */
export class FuelPricesDto {
  @Expose()
  @IsNumber()
  @ApiProperty({ example: 109.5 })
  petrol!: number;

  @Expose()
  @IsNumber()
  @ApiProperty({ example: 112.3 })
  octane!: number;

  @Expose()
  @IsNumber()
  @ApiProperty({ example: 98.7 })
  diesel!: number;
}

/** User reference DTO for lastUpdatedBy */
export class UserRefDto {
  @Expose()
  @IsInt()
  @ApiProperty({ example: 1 })
  id!: number;

  @Expose()
  @IsString()
  @ApiProperty({ example: "John Doe" })
  name!: string;
}

export class CreateStationDto {
  @IsString()
  @ApiProperty({
    description: "OSM Reference ID",
    example: "node/123456789",
    maxLength: 48,
  })
  osmRef!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Station Name",
    example: "Padma Fuel Station",
  })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Brand Name",
    example: "Shell",
  })
  brand?: string;

  @IsNumber()
  @ApiProperty({
    description: "Latitude",
    example: 23.8103,
  })
  lat!: number;

  @IsNumber()
  @ApiProperty({
    description: "Longitude",
    example: 90.4125,
  })
  lng!: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @ApiPropertyOptional({
    description: "Village name",
    example: "Badda",
  })
  village?: string;

  @IsObject()
  @IsOptional()
  @ApiPropertyOptional({
    description: "OSM tags JSON",
    example: { fuel: "yes", shop: "yes" },
  })
  tags?: Record<string, any>;
}

export class UpdateStationDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: "Station Name", example: "Padma Fuel Station" })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: "Brand Name", example: "Shell" })
  brand?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: "Latitude", example: 23.8103 })
  lat?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: "Longitude", example: 90.4125 })
  lng?: number;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ description: "Division ID", example: 1, nullable: true })
  divisionId?: number | null;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ description: "District ID", example: 10, nullable: true })
  districtId?: number | null;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description: "SubDistrict ID",
    example: 100,
    nullable: true,
  })
  subDistrictId?: number | null;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @ApiPropertyOptional({ description: "Village name", example: "Badda" })
  village?: string;

  @IsObject()
  @IsOptional()
  @ApiPropertyOptional({
    description: "OSM tags JSON",
    example: { fuel: "yes", shop: "yes" },
  })
  tags?: Record<string, any>;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Avatar image URL",
    example: "https://example.com/station-avatar.jpg",
  })
  avatar?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => FuelTypesDto)
  @ApiPropertyOptional({ type: FuelTypesDto })
  fuelTypes?: FuelTypesDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => FuelPricesDto)
  @ApiPropertyOptional({ type: FuelPricesDto })
  prices?: FuelPricesDto;

  @IsEnum(FuelStatus)
  @IsOptional()
  @ApiPropertyOptional({
    enum: FuelStatus,
    description: "Fuel availability status",
    example: FuelStatus.AVAILABLE,
  })
  status?: FuelStatus;

  @IsEnum(QueueStatus)
  @IsOptional()
  @ApiPropertyOptional({
    enum: QueueStatus,
    description: "Queue/line status",
    example: QueueStatus.LOW,
  })
  queueStatus?: QueueStatus;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Opening time",
    example: "08:00",
  })
  openingTime?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Google Maps link",
    example: "https://maps.google.com/?q=23.8103,90.4125",
  })
  googleMapLink?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Station description",
  })
  description?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Admin note",
  })
  adminNote?: string;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ description: "Last updated by user ID", example: 1 })
  lastUpdatedById?: number;
}

export class StationAdminRefDto {
  @Expose()
  @IsInt()
  @ApiProperty({ example: 1 })
  id!: number;

  @Expose()
  @IsString()
  @ApiProperty({ example: "Dhaka" })
  name!: string;
}

export class StationRes {
  @Expose()
  @IsNumber()
  id!: number;

  @Expose()
  @IsString()
  osmRef!: string;

  @Expose()
  @IsString()
  @IsOptional()
  name?: string;

  @Expose()
  @IsString()
  @IsOptional()
  brand?: string;

  @Expose()
  @IsNumber()
  lat!: number;

  @Expose()
  @IsNumber()
  lng!: number;

  @Expose()
  @ValidateNested()
  @Type(() => StationAdminRefDto)
  @IsOptional()
  @ApiPropertyOptional({ type: StationAdminRefDto })
  division?: StationAdminRefDto;

  @Expose()
  @ValidateNested()
  @Type(() => StationAdminRefDto)
  @IsOptional()
  @ApiPropertyOptional({ type: StationAdminRefDto })
  district?: StationAdminRefDto;

  @Expose()
  @ValidateNested()
  @Type(() => StationAdminRefDto)
  @IsOptional()
  @ApiPropertyOptional({ type: StationAdminRefDto })
  subDistrict?: StationAdminRefDto;

  @Expose()
  @IsString()
  @IsOptional()
  village?: string;

  @Expose()
  @IsObject()
  @IsOptional()
  tags?: Record<string, any>;

  @Expose()
  @IsDate()
  createdAt!: Date;

  @Expose()
  @IsDate()
  updatedAt!: Date;

  // New engagement and fuel fields
  @Expose()
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Avatar image URL",
    example: "https://example.com/station-avatar.jpg",
  })
  avatar?: string;

  @Expose()
  @ValidateNested()
  @Type(() => FuelTypesDto)
  @IsOptional()
  @ApiPropertyOptional({ type: FuelTypesDto })
  fuelTypes?: FuelTypesDto;

  @Expose()
  @ValidateNested()
  @Type(() => FuelPricesDto)
  @IsOptional()
  @ApiPropertyOptional({ type: FuelPricesDto })
  prices?: FuelPricesDto;

  @Expose()
  @IsEnum(FuelStatus)
  @IsOptional()
  @ApiPropertyOptional({
    enum: FuelStatus,
    description: "Fuel availability status",
    example: FuelStatus.AVAILABLE,
  })
  status?: FuelStatus;

  @Expose()
  @IsEnum(QueueStatus)
  @IsOptional()
  @ApiPropertyOptional({
    enum: QueueStatus,
    description: "Queue/line status",
    example: QueueStatus.LOW,
  })
  queueStatus?: QueueStatus;

  @Expose()
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Opening time",
    example: "08:00",
  })
  openingTime?: string;

  @Expose()
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Google Maps link",
    example: "https://maps.google.com/?q=23.8103,90.4125",
  })
  googleMapLink?: string;

  @Expose()
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Station description",
  })
  description?: string;

  @Expose()
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Admin note",
  })
  adminNote?: string;

  @Expose()
  @IsNumber()
  @ApiProperty({ example: 150, description: "Total number of likes" })
  likesCount!: number;

  @Expose()
  @IsNumber()
  @ApiProperty({ example: 89, description: "Total number of followers" })
  followersCount!: number;

  @Expose()
  @ValidateNested()
  @Type(() => UserRefDto)
  @IsOptional()
  @ApiPropertyOptional({ type: UserRefDto, description: "User who last updated the station" })
  lastUpdatedBy?: UserRefDto;
}

export class NearbyStationsQueryDto {
  @Transform(({ value }) => Number(value))
  @IsLatitude()
  @ApiProperty({ example: 23.8103 })
  lat!: number;

  @Transform(({ value }) => Number(value))
  @IsLongitude()
  @ApiProperty({ example: 90.4125 })
  lng!: number;

  @Transform(({ value }) =>
    value === undefined || value === null || value === ""
      ? 5000
      : Number(value)
  )
  @IsInt()
  @Min(100)
  @Max(25000)
  @ApiPropertyOptional({
    description: "Search radius in meters",
    example: 5000,
    default: 5000,
    minimum: 100,
    maximum: 25000,
  })
  radius = 5000;
}

export class NearbyStationRes {
  @Expose()
  @IsInt()
  @ApiProperty({ example: 123 })
  id!: number;

  @Expose()
  @IsInt()
  @ApiProperty({ example: 654321 })
  osmId!: number;

  @Expose()
  @IsString()
  @ApiProperty({ example: "node" })
  osmType!: "node" | "way" | "relation";

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: "Padma Fuel Station" })
  name!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: "Shell" })
  brand!: string | null;

  @Expose()
  @IsNumber()
  @ApiProperty({ example: 23.8103 })
  lat!: number;

  @Expose()
  @IsNumber()
  @ApiProperty({ example: 90.4125 })
  lng!: number;

  @Expose()
  @IsObject()
  @ApiPropertyOptional({ type: Object, additionalProperties: true })
  tags!: Record<string, string>;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: "Dhaka" })
  division!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: "Dhaka" })
  district!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: "Badda" })
  subDistrict!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: "Badda" })
  village!: string | null;
}

export class NearbyStationsResDto {
  @Expose()
  @IsString()
  @ApiProperty({ example: "openstreetmap" })
  source!: string;

  @Expose()
  @IsString()
  @ApiProperty({ example: "© OpenStreetMap contributors" })
  attribution!: string;

  @Expose()
  @IsInt()
  @ApiProperty({ example: 25 })
  count!: number;

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => NearbyStationRes)
  @ApiProperty({ type: [NearbyStationRes] })
  stations!: NearbyStationRes[];

  @Expose()
  @ApiProperty({ example: true })
  persisted!: boolean;
}

/** DTO for creating a like on a station */
export class CreateStationLikeDto {
  @IsInt()
  @ApiProperty({ description: "Station ID", example: 1 })
  stationId!: number;
}

/** DTO for creating a follow on a station */
export class CreateStationFollowDto {
  @IsInt()
  @ApiProperty({ description: "Station ID", example: 1 })
  stationId!: number;
}

/** DTO for creating a comment on a station */
export class CreateCommentDto {
  @IsString()
  @ApiProperty({
    description: "Comment text",
    example: "Line onek beshi",
  })
  text!: string;

  @IsInt()
  @ApiProperty({ description: "Station ID", example: 1 })
  stationId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: "Parent comment ID for nested replies (same station)",
    example: 12,
  })
  parentId?: number;
}

/** DTO for updating a comment */
export class UpdateCommentDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Comment text",
    example: "Updated line",
  })
  text?: string;
}

/** Comment author (public fields for thread UI) */
export class CommentUserRes {
  @Expose()
  @IsInt()
  @ApiProperty({ example: 5 })
  id!: number;

  @Expose()
  @IsString()
  @ApiProperty({ example: "Rahi" })
  firstName!: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: "Ahmed" })
  lastName?: string;

  @Expose()
  @IsString()
  @ApiProperty({ example: "Rahi Ahmed", description: "Display name" })
  name!: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: "https://example.com/a.jpg" })
  avatar?: string;
}

/** Response DTO for a comment */
export class CommentRes {
  @Expose()
  @IsInt()
  @ApiProperty({ example: 1 })
  id!: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({
    example: 12,
    description: "Set when this comment is a reply to another",
  })
  parentId?: number;

  @Expose()
  @IsString()
  @ApiProperty({ example: "Line onek beshi" })
  text!: string;

  @Expose()
  @IsDate()
  @ApiProperty({ example: "2024-01-15T10:30:00Z" })
  createdAt!: Date;

  @Expose()
  @IsInt()
  @ApiProperty({ example: 5, description: "User ID who commented" })
  userId!: number;

  @Expose()
  @ValidateNested()
  @Type(() => CommentUserRes)
  @ApiProperty({ type: CommentUserRes })
  user!: CommentUserRes;

  @Expose()
  @IsInt()
  @ApiProperty({ example: 1 })
  stationId!: number;
}

/** Query parameters for getting comments with filtering and pagination */
export class GetCommentsQueryDto {
  @IsOptional()
  @IsEnum(['all', 'my', 'newest', 'oldest', 'mostReply'])
  @ApiPropertyOptional({
    enum: ['all', 'my', 'newest', 'oldest', 'mostReply'],
    description: 'Filter type for comments',
    example: 'newest',
    default: 'all',
  })
  filter?: 'all' | 'my' | 'newest' | 'oldest' | 'mostReply';

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({
    description: 'Number of comments per page',
    example: 30,
    default: 30,
  })
  limit?: number;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({
    description: 'User ID for "my comments" filter (from JWT token)',
    example: 5,
  })
  userId?: number;
}