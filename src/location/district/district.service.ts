import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { EntityManager } from "@mikro-orm/core";
import { CreateDistrictDto, UpdateDistrictDto } from "../dto/district.dto";
import { DivisionSchema, IDivision } from "../entity/division.entity";
import { DistrictSchema, IDistrict } from "../entity/district.entity";
import { SubDistrictSchema } from "../entity/subDistrict.entity";
import { StationSchema } from "../../stations/station.entity";

@Injectable()
export class DistrictService {
  constructor(private readonly em: EntityManager) {}

  async findAll(): Promise<IDistrict[]> {
    return this.em.find(DistrictSchema, {}, { populate: ["division"] as const });
  }

  async findOne(id: number): Promise<IDistrict> {
    const row = await this.em.findOne(
      DistrictSchema,
      { id },
      { populate: ["division"] as const }
    );
    if (!row) {
      throw new NotFoundException(`District with ID ${id} not found`);
    }
    return row;
  }

  async findOneWithChildren(id: number): Promise<IDistrict> {
    const row = await this.em.findOne(
      DistrictSchema,
      { id },
      { populate: ["division", "subDistricts"] as const }
    );
    if (!row) {
      throw new NotFoundException(`District with ID ${id} not found`);
    }
    return row;
  }

  async create(dto: CreateDistrictDto): Promise<IDistrict> {
    const division = await this.em.findOne(DivisionSchema, {
      id: dto.divisionId,
    });
    if (!division) {
      throw new NotFoundException(`Division with ID ${dto.divisionId} not found`);
    }

    const duplicate = await this.em.findOne(DistrictSchema, {
      division,
      name: dto.name,
    });
    if (duplicate) {
      throw new ConflictException(
        "A district with this name already exists in this division"
      );
    }

    const row = this.em.create(DistrictSchema, {
      name: dto.name,
      description: dto.description ?? "",
      division,
      isActive: dto.isActive ?? true,
    });
    await this.em.flush();
    return row;
  }

  async update(id: number, dto: UpdateDistrictDto): Promise<IDistrict> {
    const row = await this.findOne(id);
    let division: IDivision = row.division as IDivision;

    if (dto.divisionId != null && dto.divisionId !== division.id) {
      const next = await this.em.findOne(DivisionSchema, { id: dto.divisionId });
      if (!next) {
        throw new NotFoundException(`Division with ID ${dto.divisionId} not found`);
      }
      division = next;
      row.division = next;
    }

    if (dto.name != null && dto.name !== row.name) {
      const duplicate = await this.em.findOne(DistrictSchema, {
        division,
        name: dto.name,
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          "A district with this name already exists in this division"
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
    const subCount = await this.em.count(SubDistrictSchema, { district: row });
    if (subCount > 0) {
      throw new ConflictException(
        "Cannot delete district while it has sub-districts. Remove them first."
      );
    }
    const stationCount = await this.em.count(StationSchema, { district: row });
    if (stationCount > 0) {
      throw new ConflictException(
        "Cannot delete district while stations reference it."
      );
    }
    await this.em.remove(row);
    await this.em.flush();
  }
}
