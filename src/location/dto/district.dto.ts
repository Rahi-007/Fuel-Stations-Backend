import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsOptional, IsString } from 'class-validator';
import { DivisionRes } from './division.dto';
import { SubDistrictRes } from './subDistrict.dto';

export class CreateDistrictDto {
  @IsString()
  @ApiProperty({
    description: 'District Name',
    example: 'Gazipur',
  })
  name!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Description for District',
    example: 'This is Gazipur District',
  })
  description?: string;

  @IsInt()
  @ApiProperty({
    description: 'Division ID',
    example: 3,
  })
  divisionId!: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'District status',
    example: true,
  })
  isActive?: boolean;
}

export class UpdateDistrictDto extends PartialType(CreateDistrictDto) { }

export class DistrictRes {
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
  @Type(() => DivisionRes)
  division?: DivisionRes;

  @Expose()
  @Type(() => SubDistrictRes)
  subDistricts?: SubDistrictRes[];
}