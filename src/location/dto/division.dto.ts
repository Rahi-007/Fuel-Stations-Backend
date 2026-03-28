import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
} from "class-validator";
import { DistrictRes } from "./district.dto";

export class CreateDivisionDto {
  @IsString()
  @ApiProperty({
    description: "Division Name",
    example: "Rajshahi",
  })
  name!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Description for Division",
    example: "This is Rajshahi Division",
  })
  description?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Division status",
    example: false,
  })
  isActive?: boolean;
}

export class UpdateDivisionDto extends PartialType(CreateDivisionDto) { }

export class DivisionRes {
  @Expose()
  @IsInt()
  id!: number;

  @Expose()
  @IsString()
  name!: string;

  @Expose()
  @IsString()
  @IsOptional()
  description?: string;

  @Expose()
  @IsBoolean()
  isActive!: boolean;

  @Expose()
  @IsDate()
  createdAt!: Date;

  @Expose()
  @IsDate()
  updatedAt!: Date;

  @Expose()
  @Type(() => DistrictRes)
  districts?: DistrictRes[];
}
