import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
} from "class-validator";
import { Expose, Type } from "class-transformer";
import { DivisionRes } from "./division.dto";
import { DistrictRes } from "./district.dto";

export class CreateSubDistrictDto {
  @IsString()
  @ApiProperty({
    description: "SubDistrict Name",
    example: "Kaliganj",
  })
  name!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Description for SubDistrict",
    example: "This is Kaliganj Upazila",
  })
  description?: string;

  @IsInt()
  @ApiProperty({
    description: "District ID",
    example: 2,
  })
  districtId!: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: "SubDistrict status",
    example: true,
  })
  isActive?: boolean;
}

export class UpdateSubDistrictDto extends PartialType(CreateSubDistrictDto) {}

export class SubDistrictRes {
  @Expose()
  @IsInt()
  id!: number;

  @Expose()
  @IsString()
  name!: string;

  @Expose()
  description?: string;

  @Expose()
  @IsBoolean()
  isActive!: boolean;

  @Expose()
  @Type(() => DivisionRes)
  division?: DivisionRes;
  
  @Expose()
  @Type(() => DistrictRes)
  district?: DistrictRes;

  @Expose()
  @IsDate()
  createdAt!: Date;

  @Expose()
  @IsDate()
  updatedAt!: Date;
}
