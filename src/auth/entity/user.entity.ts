import { Entity, Property, ManyToOne, OneToMany } from '@mikro-orm/core';
import { BloodGroup, Gender, Role } from "../../utils/enums";
import { BaseSchema } from "./base.entity";

@Entity()
export class UserSchema extends BaseSchema {
  @Property({ length: 191 })
  firstName!: string;

  @Property({ length: 191, nullable: true })
  lastName?: string;

  @Property({ unique: true, length: 16, nullable: true })
  phone?: string;

  @Property({ length: 191, nullable: true })
  avatar?: string;

  @Property({ unique: true, length: 64 })
  email!: string;

  @Property({ length: 64 })
  passHash!: string;

  @Property({ length: 64, nullable: true })
  address?: string;

  @Property({ nullable: true })
  dob?: Date;

  @Property({ type: 'string', nullable: true })
  gender?: Gender;

  @Property({ type: 'string', nullable: true })
  bloodGroup?: BloodGroup;

  @Property({ default: false })
  isVerified = false;

  @Property({ default: false })
  isBlocked = false;

  @Property({ type: 'string', default: Role.USER })
  role!: Role;

  @Property({ nullable: true })
  lastLoggedIn?: Date;

  @Property({ default: 0, nullable: true })
  trustScore?: number;

  @Property({ default: 0, nullable: true })
  totalReports?: number;

  @Property({ default: 0, nullable: true })
  correctReports?: number;
}

export type IUser = UserSchema;
