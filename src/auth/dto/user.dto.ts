import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import {
  IsDate,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
} from "class-validator";
import { BloodGroup, Gender, Role, UserStatus } from "../../utils/enums";

export class CreateUserDto {
  @IsString()
  @ApiProperty({
    description: "First Name",
    example: "John",
  })
  firstName!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Last Name",
    example: "Doe",
  })
  lastName?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Phone Number",
    example: "1234567890",
    maxLength: 24,
  })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsString()
  @ApiProperty({
    description: "Email",
    example: "Wl1yS@example.com",
    maxLength: 64,
  })
  email!: string;

  @IsString()
  @ApiProperty({
    description: "Password",
    minLength: 8,
  })
  password!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Address",
    example: "123 Main Street, USA",
  })
  address?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Date of birth",
    example: "1990-01-01"
  })
  dob?: string;

  @IsEnum(Gender)
  @IsOptional()
  @ApiPropertyOptional({
    description: "Gender of User",
    example: Gender.Male,
    enum: Gender,
  })
  gender?: Gender;

  @IsEnum(BloodGroup)
  @IsOptional()
  @ApiPropertyOptional({
    description: "Blood group of User",
    example: BloodGroup.O_POS,
    enum: BloodGroup,
  })
  bloodGroup?: BloodGroup;

  @IsEnum(Role)
  @IsOptional()
  @ApiPropertyOptional({
    description: "Role of User",
    example: Role.USER,
    enum: Role,
  })
  role?: Role;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "User Avatar URL",
    example: "https://example.com/avatar.jpg",
  })
  avatar?: string;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description: "User trust score",
    example: 0,
  })
  trustScore?: number;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Total reports submitted by user",
    example: 0,
  })
  totalReports?: number;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Correct reports submitted by user",
    example: 0,
  })
  correctReports?: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: "User verification status",
    example: false,
  })
  isVerified?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: "User blocked status",
    example: false,
  })
  isBlocked?: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) { }

export class UserRes {
  @Expose()
  @IsInt()
  id!: number;

  @Expose()
  @IsString()
  firstName!: string;

  @Expose()
  @IsString()
  @IsOptional()
  lastName?: string;

  @Expose()
  @IsString()
  @IsOptional()
  phone?: string;

  @Expose()
  @IsString()
  email!: string;

  @Expose()
  @IsString()
  @IsOptional()
  address?: string;

  @Expose()
  @IsString()
  @IsOptional()
  avatar?: string;

  @Expose()
  @IsDate()
  @IsOptional()
  dob?: Date;

  @Expose()
  @IsDate()
  @IsOptional()
  lastLoggedIn?: Date;

  @Expose()
  @IsString()
  @IsOptional()
  gender?: string;

  @Expose()
  @IsString()
  @IsOptional()
  bloodGroup!: string;

  @Expose()
  @IsBoolean()
  isVerified!: boolean;

  @Expose()
  @IsBoolean()
  isBlocked!: boolean;

  @Expose()
  @IsEnum(Role)
  role!: Role;

  @Expose()
  @IsInt()
  @IsOptional()
  trustScore?: number;

  @Expose()
  @IsInt()
  @IsOptional()
  totalReports?: number;

  @Expose()
  @IsInt()
  @IsOptional()
  correctReports?: number;

  @Expose()
  @IsDate()
  createdAt!: Date;

  @Expose()
  @IsDate()
  updatedAt!: Date;
}
