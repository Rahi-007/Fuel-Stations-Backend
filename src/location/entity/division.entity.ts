import { defineEntity, type InferEntity, p } from '@mikro-orm/core';
import { BaseSchema } from '../../auth/entity/base.entity';
import { DistrictSchema } from './district.entity';

export const DivisionSchema = defineEntity({
  name: 'Division',
  extends: BaseSchema,
  properties: {
    name: p.string().unique().index().length(191),
    description: p.string().nullable().length(191),
    districts: () => p.oneToMany(DistrictSchema).mappedBy('division'),
    isActive: p.boolean().default(true),
  },
});

export type IDivision = InferEntity<typeof DivisionSchema>;