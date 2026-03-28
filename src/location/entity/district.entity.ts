import { defineEntity, type InferEntity, p } from '@mikro-orm/core';
import { BaseSchema } from '../../auth/entity/base.entity';
import { DivisionSchema } from './division.entity';
import { SubDistrictSchema } from './subDistrict.entity';

export const DistrictSchema = defineEntity({
  name: 'District',
  extends: BaseSchema,
  properties: {
    name: p.string().length(191),
    description: p.string().nullable().length(191),
    division: () => p.manyToOne(DivisionSchema),
    subDistricts: () => p.oneToMany(SubDistrictSchema).mappedBy('district'),
    isActive: p.boolean().default(true),
  },
});

export type IDistrict = InferEntity<typeof DistrictSchema>;