import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  HttpException,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { SubDistrictService } from "./sub-district.service";
import {
  CreateSubDistrictDto,
  SubDistrictRes,
  UpdateSubDistrictDto,
} from "../dto/subDistrict.dto";
import { DistrictRes } from "../dto/district.dto";
import { DivisionRes } from "../dto/division.dto";
import { ISubDistrict } from "../entity/subDistrict.entity";
import { IDistrict } from "../entity/district.entity";
import { IDivision } from "../entity/division.entity";
import { Role } from "../../utils/enums";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";

@ApiTags("Locations — Sub-districts")
@Controller("sub-districts")
@ApiBearerAuth("JWT-auth")
export class SubDistrictController {
  constructor(private readonly subDistrictService: SubDistrictService) {}

  @ApiOperation({ summary: "List sub-districts (admin)" })
  @ApiResponse({ status: 200, type: SubDistrictRes, isArray: true })
  @Get()
  async findAll(): Promise<SubDistrictRes[]> {
    try {
      const rows = await this.subDistrictService.findAll();
      return rows.map((r) => this.buildRes(r));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to fetch sub-districts");
    }
  }

  @ApiOperation({ summary: "Get sub-district by ID (admin)" })
  @ApiResponse({ status: 200, type: SubDistrictRes })
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number): Promise<SubDistrictRes> {
    try {
      const row = await this.subDistrictService.findOne(id);
      return this.buildRes(row);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to fetch sub-district");
    }
  }

  @ApiOperation({ summary: "Create sub-district (admin)" })
  @ApiResponse({ status: 201, type: SubDistrictRes })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() dto: CreateSubDistrictDto): Promise<SubDistrictRes> {
    try {
      const row = await this.subDistrictService.create(dto);
      return this.buildRes(row);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to create sub-district");
    }
  }

  @ApiOperation({ summary: "Update sub-district (admin)" })
  @ApiResponse({ status: 200, type: SubDistrictRes })
  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSubDistrictDto
  ): Promise<SubDistrictRes> {
    try {
      const row = await this.subDistrictService.update(id, dto);
      return this.buildRes(row);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to update sub-district");
    }
  }

  @ApiOperation({ summary: "Delete sub-district if unused (admin)" })
  @HttpCode(HttpStatus.OK)
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    try {
      await this.subDistrictService.remove(id);
      return { message: `Sub-district ${id} deleted successfully` };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to delete sub-district");
    }
  }

  private buildDistrictEmbedded(
    d: NonNullable<ISubDistrict["district"]>
  ): DistrictRes {
    const row = d as NonNullable<ISubDistrict["district"]> & {
      id: number;
      name: string;
      description?: string | null;
      isActive?: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      isActive: row.isActive ?? false,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private buildDivisionSummary(div: IDivision | null | undefined): DivisionRes | undefined {
    if (div == null || typeof div !== "object") return undefined;
    return {
      id: div.id,
      name: div.name,
      description: div.description ?? "",
      isActive: div.isActive ?? false,
      createdAt: div.createdAt!,
      updatedAt: div.updatedAt!,
    };
  }

  private buildRes(row: ISubDistrict): SubDistrictRes {
    const district = row.district;
    const out: SubDistrictRes = {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      isActive: row.isActive ?? false,
      createdAt: row.createdAt!,
      updatedAt: row.updatedAt!,
    };
    if (district != null && typeof district === "object") {
      const d = district as IDistrict;
      out.district = this.buildDistrictEmbedded(district);
      if (d.division != null && typeof d.division === "object") {
        out.division = this.buildDivisionSummary(d.division as IDivision);
      }
    }
    return out;
  }
}
