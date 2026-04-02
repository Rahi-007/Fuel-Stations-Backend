import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseSchema } from '../../auth/entity/base.entity';
import { DistrictSchema } from './district.entity';

@Entity()
export class DivisionSchema extends BaseSchema {
  @Property({ unique: true, length: 191 })
  name!: string;

  @Property({ length: 191, nullable: true })
  description?: string;

  @OneToMany(() => DistrictSchema, 'division')
  districts = new Collection<DistrictSchema>(this);

  @Property({ default: true })
  isActive = true;
}

export type IDivision = DivisionSchema;