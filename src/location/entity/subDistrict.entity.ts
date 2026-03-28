import { defineEntity, type InferEntity, p } from '@mikro-orm/core';
import { BaseSchema } from '../../auth/entity/base.entity';
import { DistrictSchema } from './district.entity';

export const SubDistrictSchema = defineEntity({
  name: 'SubDistrict',
  extends: BaseSchema,
  properties: {
    name: p.string().index().length(191),
    description: p.string().nullable().length(191),
    district: () => p.manyToOne(DistrictSchema),
    isActive: p.boolean().default(true),
  },
});

export type ISubDistrict = InferEntity<typeof SubDistrictSchema>;