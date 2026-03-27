import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UnauthorizedException,
  InternalServerErrorException,
  ForbiddenException,
  HttpException,
  UseGuards,
  Request,
} from "@nestjs/common";
import { CustomJwtService } from "../config/jwt/jwt.service";
import { LoginDto, LoginResponseDto } from "./dto/logIn.dto";
import { AuthService } from "./auth.service";
import { CreateUserDto, UpdateUserDto, UserRes } from "./dto/user.dto";
import { Role } from "../utils/enums";
import { ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Roles } from "./decorators/roles.decorator";
import { RolesGuard } from "./guards/roles.guard";
import { IUser } from "./entites/user.entity";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly jwtService: CustomJwtService,
    private readonly authService: AuthService
  ) {}

  // Login endpoint
  @Post("login")
  @ApiOperation({ summary: "User login" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    try {
      const user = await this.authService.validateUser(loginDto);

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken(payload),
        this.jwtService.generateRefreshToken(payload),
      ]);

      const userRes = this.buildUserResponse(user);

      return {
        accessToken,
        refreshToken,
        user: userRes,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException("Something went wrong");
    }
  }

  @ApiBearerAuth("JWT-auth")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Get all users" })
  @ApiResponse({
    status: 200,
    description: "Users retrieved successfully",
    type: UserRes,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized (invalid or missing token)",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden (admin access required)",
  })
  @ApiResponse({ status: 500, description: "Internal server error" })
  @HttpCode(HttpStatus.OK)
  @Get("users")
  async findAll(): Promise<UserRes[]> {
    try {
      const users = await this.authService.findAll();
      return users.map((user) => this.buildUserResponse(user));
    } catch (error) {
      console.error("Fetch Users Error:", error);

      throw new InternalServerErrorException("Failed to fetch users");
    }
  }

  /**
   * Get user by ID
   */
  @ApiOperation({ summary: "Get user by ID (public)" })
  @ApiBearerAuth("JWT-auth")
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: "User retrieved successfully",
    type: UserRes,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized (invalid or missing token)",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden (only owner or admin can access)",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  @Get("users/:id")
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @Request() req: { user?: { sub?: number; role?: Role } }
  ): Promise<UserRes> {
    try {
      const isAdmin = req.user?.role === Role.ADMIN;
      const isOwner = req.user?.sub === id;
      if (!isAdmin && !isOwner) {
        throw new ForbiddenException("You can only access your own profile");
      }
      const user = await this.authService.findOne(id);
      return this.buildUserResponse(user);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to fetch user");
    }
  }

  /**
   * Register a new user
   */
  @Post("register")
  @ApiOperation({ summary: "Register user and auto login" })
  @ApiResponse({
    status: 200,
    description: "Registration successful and auto login completed",
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 409, description: "Email or phone already exists" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async register(@Body() createUserDto: CreateUserDto): Promise<LoginResponseDto> {
    try {
      const newUser = await this.authService.create(createUserDto);
      const loggedInUser = await this.authService.updateLastLoggedIn(newUser);

      const payload = {
        sub: loggedInUser.id,
        email: loggedInUser.email,
        role: loggedInUser.role,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken(payload),
        this.jwtService.generateRefreshToken(payload),
      ]);

      return {
        accessToken,
        refreshToken,
        user: this.buildUserResponse(loggedInUser),
      };
    } catch (error) {
      throw new Error(
        `Failed to register user: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Update an existing user
   */
  @ApiOperation({ summary: "Update user by ID (owner or admin)" })
  @ApiBearerAuth("JWT-auth")
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: "User updated successfully",
    type: UserRes,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized (invalid or missing token)",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden (only owner or admin can update)",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 409, description: "Email or phone already exists" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  @Put("users/:id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: { user?: { sub?: number; role?: Role } }
  ): Promise<UserRes> {
    try {
      const isAdmin = req.user?.role === Role.ADMIN;
      const isOwner = req.user?.sub === id;
      if (!isAdmin && !isOwner) {
        throw new ForbiddenException("You can only update your own profile");
      }
      const updatedUser = await this.authService.update(id, updateUserDto);
      return this.buildUserResponse(updatedUser);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to update user");
    }
  }

  /**
   * Delete a user
   */
  @ApiBearerAuth("JWT-auth")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Delete user by ID (admin only)" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({
    status: 401,
    description: "Unauthorized (invalid or missing token)",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden (admin access required)",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  @Delete("users/:id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    try {
      await this.authService.remove(id);
      return { message: `User with ID ${id} deleted successfully` };
    } catch (error) {
      throw new Error(
        `Failed to delete user: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  
  private buildUserResponse(user: IUser): UserRes {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName ?? "",
      email: user.email,
      phone: user.phone ?? "",
      address: user.address ?? "",
      role: user.role,
      dob: user.dob ?? undefined,
      lastLoggedIn: user.lastLoggedIn ?? undefined,
      gender: user.gender ?? "",
      bloodGroup: user.bloodGroup ?? "",
      avatar: user.avatar ?? "",
      trustScore: user.trustScore ?? 0,
      totalReports: user.totalReports ?? 0,
      correctReports: user.correctReports ?? 0,
      isVerified: user.isVerified ?? false,
      isBlocked: user.isBlocked ?? false,
      createdAt: user.createdAt ?? undefined,
      updatedAt: user.updatedAt ?? undefined,
    };
  }
}
