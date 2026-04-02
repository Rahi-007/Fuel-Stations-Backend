import { Entity, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { BaseSchema } from '../../auth/entity/base.entity';
import { DivisionSchema } from './division.entity';
import { SubDistrictSchema } from './subDistrict.entity';

@Entity()
export class DistrictSchema extends BaseSchema {
  @Property({ length: 191 })
  name!: string;

  @Property({ length: 191, nullable: true })
  description?: string;

  @ManyToOne(() => DivisionSchema)
  division!: DivisionSchema;

  @OneToMany(() => SubDistrictSchema, 'district')
  subDistricts = new Collection<SubDistrictSchema>(this);

  @Property({ default: true })
  isActive = true;
}

export type IDistrict = DistrictSchema;