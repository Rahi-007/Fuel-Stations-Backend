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
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";

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