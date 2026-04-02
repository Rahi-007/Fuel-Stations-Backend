import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { EntityManager } from "@mikro-orm/core";
import { CreateSubDistrictDto, UpdateSubDistrictDto } from "../dto/subDistrict.dto";
import { DistrictSchema, IDistrict } from "../entity/district.entity";
import { SubDistrictSchema, ISubDistrict } from "../entity/subDistrict.entity";
import { StationSchema } from "../../stations/station.entity";

@Injectable()
export class SubDistrictService {
  constructor(private readonly em: EntityManager) { }

  async findAll(): Promise<ISubDistrict[]> {
    return this.em.find(
      SubDistrictSchema,
      {},
      { populate: ["district", "district.division"] as const }
    );
  }

  async findOne(id: number): Promise<ISubDistrict> {
    const row = await this.em.findOne(
      SubDistrictSchema,
      { id },
      { populate: ["district", "district.division"] as const }
    );
    if (!row) {
      throw new NotFoundException(`Sub-district with ID ${id} not found`);
    }
    return row;
  }

  async create(dto: CreateSubDistrictDto): Promise<ISubDistrict> {
    const district = await this.em.findOne(DistrictSchema, {
      id: dto.districtId,
    });
    if (!district) {
      throw new NotFoundException(`District with ID ${dto.districtId} not found`);
    }

    const duplicate = await this.em.findOne(SubDistrictSchema, {
      district,
      name: dto.name,
    });
    if (duplicate) {
      throw new ConflictException(
        "A sub-district with this name already exists in this district"
      );
    }

    const row = this.em.create(SubDistrictSchema, {
      name: dto.name,
      description: dto.description ?? "",
      district,
      isActive: dto.isActive ?? true,
    } as any);
    await this.em.flush();
    return row;
  }

  async update(id: number, dto: UpdateSubDistrictDto): Promise<ISubDistrict> {
    const row = await this.findOne(id);
    let district: IDistrict = row.district as IDistrict;

    if (dto.districtId != null && dto.districtId !== district.id) {
      const next = await this.em.findOne(DistrictSchema, { id: dto.districtId });
      if (!next) {
        throw new NotFoundException(`District with ID ${dto.districtId} not found`);
      }
      district = next;
      row.district = next;
    }

    if (dto.name != null && dto.name !== row.name) {
      const duplicate = await this.em.findOne(SubDistrictSchema, {
        district,
        name: dto.name,
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          "A sub-district with this name already exists in this district"
        );
      }
      row.name = dto.name;
    }

    if (dto.description !== undefined) {
      row.description = dto.description;
    }
    if (dto.isActive !== undefined) {
      row.isActive = dto.isActive;
    }

    row.updatedAt = new Date();
    await this.em.flush();
    return row;
  }

  async remove(id: number): Promise<void> {
    const row = await this.findOne(id);
    const stationCount = await this.em.count(StationSchema, { subDistrict: row });
    if (stationCount > 0) {
      throw new ConflictException(
        "Cannot delete sub-district while stations reference it."
      );
    }
    await this.em.remove(row);
    await this.em.flush();
  }
}
