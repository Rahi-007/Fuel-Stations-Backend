import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { CreateDivisionDto, UpdateDivisionDto } from "../dto/division.dto";
import { DivisionSchema, IDivision } from "../entity/division.entity";
import { DistrictSchema } from "../entity/district.entity";
import { EntityManager } from "@mikro-orm/core";

interface ICreateDivisionDto extends CreateDivisionDto {
  createdAt?: Date;
}

interface IUpdateDivisionDto extends UpdateDivisionDto {
  updatedAt?: Date;
}

@Injectable()
export class DivisionService {
  constructor(private readonly em: EntityManager) { }

  // Get all division
  async findAll(): Promise<IDivision[]> {
    return this.em.find(DivisionSchema, {});
  }

  // Get division by ID
  async findOne(id: number): Promise<IDivision> {
    const division = await this.em.findOne(DivisionSchema, { id });
    if (!division) {
      throw new NotFoundException(`Division with ID ${id} not found`);
    }
    return division;
  }

  // Create a new user
  async create(createDivisionDto: ICreateDivisionDto): Promise<IDivision> {
    // Check if name already exists
    const existingName = await this.em.findOne(DivisionSchema, {
      name: createDivisionDto.name,
    });
    if (existingName) {
      throw new ConflictException("Name already exists");
    }

    const division = this.em.create(DivisionSchema, {
      name: createDivisionDto.name,
      description: createDivisionDto.description || "",
      isActive: createDivisionDto.isActive || false,
      createdAt: new Date(),
    } as any);

    await this.em.flush();

    return division;
  }

  // Update an existing user
  async update(
    id: number,
    updateDivisionDto: IUpdateDivisionDto
  ): Promise<IDivision> {
    const division = await this.findOne(id);

    // Check if name is being changed and already exists for another division
    if (updateDivisionDto.name && updateDivisionDto.name !== division.name) {
      const existingName = await this.em.findOne(DivisionSchema, {
        name: updateDivisionDto.name,
      });
      if (existingName && existingName.id !== id) {
        throw new ConflictException("Name already exists");
      }
    }

    // Update only provided fields
    if (updateDivisionDto.name !== undefined) {
      division.name = updateDivisionDto.name;
    }
    if (updateDivisionDto.description !== undefined) {
      division.description = updateDivisionDto.description;
    }
    if (updateDivisionDto.isActive !== undefined) {
      division.isActive = updateDivisionDto.isActive;
    }

    // Update timestamp
    division.updatedAt = new Date();
    await this.em.flush();
    return division;
  }

  /** Includes districts and their sub-districts (for admin detail view). */
  async findOneWithChildren(id: number): Promise<IDivision> {
    const division = await this.em.findOne(
      DivisionSchema,
      { id },
      { populate: ["districts", "districts.subDistricts"] as const }
    );
    if (!division) {
      throw new NotFoundException(`Division with ID ${id} not found`);
    }
    return division;
  }

  // Delete division (only if no districts)
  async remove(id: number): Promise<void> {
    const division = await this.findOne(id);
    const childCount = await this.em.count(DistrictSchema, { division });
    if (childCount > 0) {
      throw new ConflictException(
        "Cannot delete division while it has districts. Remove districts first."
      );
    }
    await this.em.remove(division);
    await this.em.flush();
  }
}
