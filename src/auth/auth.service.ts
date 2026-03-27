import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { EntityManager } from '@mikro-orm/core';
import { UserSchema, IUser } from './entites/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { LoginDto } from './dto/logIn.dto';
import * as bcrypt from 'bcrypt';

interface ICreateUserDto extends CreateUserDto {
  createdAt?: Date;
}

interface IUpdateUserDto extends UpdateUserDto {
  updatedAt?: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly em: EntityManager,
  ) {}

  // User Login
  async validateUser(loginDto: LoginDto): Promise<IUser>{
    // Find user by email
    const user = await this.em.findOne(UserSchema, { email: loginDto.email });
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare password with hash
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passHash);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoggedIn = new Date();
    await this.em.flush();

    return user;
  }

  /**
   * Get all users
   */
  async findAll(): Promise<IUser[]> {
    return this.em.find(UserSchema, {});
  }

  /**
   * Get user by ID
   */
  async findOne(id: number): Promise<IUser> {
    const user = await this.em.findOne(UserSchema, { id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Create a new user
   */
  async create(createUserDto: ICreateUserDto): Promise<IUser> {
    // Check if email already exists
    const existingEmail = await this.em.findOne(UserSchema, { email: createUserDto.email });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if phone already exists (if provided)
    if (createUserDto.phone) {
      const existingPhone = await this.em.findOne(UserSchema, { phone: createUserDto.phone });
      if (existingPhone) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    const user = this.em.create(UserSchema, {
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      phone: createUserDto.phone,
      email: createUserDto.email,
      passHash: hashedPassword,
      address: createUserDto.address,
      dob: createUserDto.dob ? new Date(createUserDto.dob) : undefined,
      gender: createUserDto.gender,
      bloodGroup: createUserDto.bloodGroup,
      role: createUserDto.role,
      trustScore: createUserDto.trustScore || 0,
      totalReports: createUserDto.totalReports || 0,
      correctReports: createUserDto.correctReports || 0,
      isVerified: createUserDto.isVerified || false,
      isBlocked: createUserDto.isBlocked || false,
      createdAt: new Date(),
    });
    
    await this.em.flush();
    
    return user;
  }

  /**
   * Update an existing user
   */
  async update(id: number, updateUserDto: IUpdateUserDto): Promise<IUser> {
    const user = await this.findOne(id);
    
    // Check if email is being changed and already exists for another user
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.em.findOne(UserSchema, { email: updateUserDto.email });
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    // Check if phone is being changed and already exists for another user
    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const existingPhone = await this.em.findOne(UserSchema, { phone: updateUserDto.phone });
      if (existingPhone && existingPhone.id !== id) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // Update only provided fields
    if (updateUserDto.firstName !== undefined) {
      user.firstName = updateUserDto.firstName;
    }
    if (updateUserDto.lastName !== undefined) {
      user.lastName = updateUserDto.lastName;
    }
    if (updateUserDto.phone !== undefined) {
      user.phone = updateUserDto.phone;
    }
    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }
    if (updateUserDto.password !== undefined) {
      // Hash new password
      const saltRounds = 10;
      user.passHash = await bcrypt.hash(updateUserDto.password, saltRounds);
    }
    if (updateUserDto.address !== undefined) {
      user.address = updateUserDto.address;
    }
    if (updateUserDto.dob !== undefined) {
      user.dob = updateUserDto.dob ? new Date(updateUserDto.dob) : null;
    }
    if (updateUserDto.gender !== undefined) {
      user.gender = updateUserDto.gender;
    }
    if (updateUserDto.bloodGroup !== undefined) {
      user.bloodGroup = updateUserDto.bloodGroup;
    }
    if (updateUserDto.avatar !== undefined) {
      user.avatar = updateUserDto.avatar;
    }
    if (updateUserDto.trustScore !== undefined) {
      user.trustScore = updateUserDto.trustScore;
    }
    if (updateUserDto.totalReports !== undefined) {
      user.totalReports = updateUserDto.totalReports;
    }
    if (updateUserDto.correctReports !== undefined) {
      user.correctReports = updateUserDto.correctReports;
    }
    if (updateUserDto.isVerified !== undefined) {
      user.isVerified = updateUserDto.isVerified;
    }
    if (updateUserDto.isBlocked !== undefined) {
      user.isBlocked = updateUserDto.isBlocked;
    }
    if (updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
    }
    
    // Update timestamp
    user.updatedAt = new Date();
    
    // if (updateUserDto. !== undefined) {
    //   user.status = updateUserDto.status;
    // }

    await this.em.flush();
    
    return user;
  }

  /**
   * Delete a user
   */
  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.em.remove(user);
    await this.em.flush();
  }

  async updateLastLoggedIn(user: IUser): Promise<IUser> {
    user.lastLoggedIn = new Date();
    await this.em.flush();
    return user;
  }
}
