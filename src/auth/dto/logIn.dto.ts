import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { UserRes } from "./user.dto";

// DTOs for authentication
export class LoginDto {
  @IsString()
  @ApiProperty({
    description: "User email",
    example: "user@example.com",
  })
  email!: string;

  @IsString()
  @ApiProperty({
    description: "User password",
    example: "password123",
  })
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @ApiProperty({
    description: "Refresh token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  refreshToken!: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: "Access token" })
  accessToken!: string;

  @ApiProperty({ description: "Refresh token" })
  refreshToken!: string;

  @ApiProperty({ type: UserRes, description: "User information" })
  user!: UserRes;
}
