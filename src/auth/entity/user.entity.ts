import { defineEntity, type InferEntity, p } from '@mikro-orm/core';
import { BloodGroup, Gender, Role, UserStatus } from "../../utils/enums";
import { BaseSchema } from "./base.entity";

export const UserSchema = defineEntity({
  name: 'User',
  extends: BaseSchema,
  properties: {
    firstName: p.string().index().length(191),
    lastName: p.string().nullable().length(191),
    phone: p.string().unique().nullable().length(16),
    avatar: p.string().nullable().length(191),
    email: p.string().unique().length(64),
    passHash: p.string().length(64),
    address: p.string().nullable().length(64),
    dob: p.datetime().nullable(),
    gender: p.enum(() => Gender).nullable(),
    bloodGroup: p.enum(() => BloodGroup).nullable(),
    isVerified: p.boolean().default(false),
    isBlocked: p.boolean().default(false),
    status: p.enum(() => UserStatus).default(UserStatus.Active),
    role: p.enum(() => Role).default(Role.USER),
    lastLoggedIn: p.datetime().nullable(),
    trustScore: p.float().default(0).nullable(),
    totalReports: p.integer().default(0).nullable(),
    correctReports: p.integer().default(0).nullable(),
  },
});

export type IUser = InferEntity<typeof UserSchema>;
