import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsObject,
  IsDate,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";

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

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Division ID",
    example: 1,
  })
  divisionId?: number;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description: "District ID",
    example: 10,
  })
  districtId?: number;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description: "SubDistrict ID",
    example: 100,
  })
  subDistrictId?: number;

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

export class UpdateStationDto extends PartialType(CreateStationDto) {}

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
  @IsOptional()
  division?: {
    id: number;
    name: string;
  };

  @Expose()
  @IsOptional()
  district?: {
    id: number;
    name: string;
  };

  @Expose()
  @IsOptional()
  subDistrict?: {
    id: number;
    name: string;
  };

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