import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseSchema } from '../../auth/entity/base.entity';
import { DistrictSchema } from './district.entity';

@Entity()
export class SubDistrictSchema extends BaseSchema {
  @Property({ length: 191 })
  name!: string;

  @Property({ length: 191, nullable: true })
  description?: string;

  @ManyToOne(() => DistrictSchema)
  district!: DistrictSchema;

  @Property({ default: true })
  isActive = true;
}

export type ISubDistrict = SubDistrictSchema;