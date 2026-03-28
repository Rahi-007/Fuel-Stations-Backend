import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  HttpException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { DivisionService } from "./division.service";
import {
  CreateDivisionDto,
  DivisionRes,
  UpdateDivisionDto,
} from "../dto/division.dto";
import { DistrictRes } from "../dto/district.dto";
import { SubDistrictRes } from "../dto/subDistrict.dto";
import { IDivision } from "../entity/division.entity";
import { IDistrict } from "../entity/district.entity";
import { ISubDistrict } from "../entity/subDistrict.entity";
import { Role } from "../../utils/enums";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";

@ApiTags("Locations — Divisions")
@Controller("divisions")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DivisionController {
  constructor(private readonly divisionService: DivisionService) {}

  @ApiOperation({ summary: "List all divisions (admin)" })
  @ApiResponse({ status: 200, type: DivisionRes, isArray: true })
  @HttpCode(HttpStatus.OK)
  @Get()
  async findAll(): Promise<DivisionRes[]> {
    try {
      const rows = await this.divisionService.findAll();
      return rows.map((r) => this.buildDivisionRes(r));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to fetch divisions");
    }
  }

  @ApiOperation({ summary: "Get division by ID with districts & sub-districts (admin)" })
  @ApiResponse({ status: 200, type: DivisionRes })
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number): Promise<DivisionRes> {
    try {
      const row = await this.divisionService.findOneWithChildren(id);
      return this.buildDivisionRes(row, true);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to fetch division");
    }
  }

  @ApiOperation({ summary: "Create division (admin)" })
  @ApiResponse({ status: 201, type: DivisionRes })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() dto: CreateDivisionDto): Promise<DivisionRes> {
    try {
      const row = await this.divisionService.create(dto);
      return this.buildDivisionRes(row);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to create division");
    }
  }

  @ApiOperation({ summary: "Update division (admin)" })
  @ApiResponse({ status: 200, type: DivisionRes })
  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateDivisionDto
  ): Promise<DivisionRes> {
    try {
      const row = await this.divisionService.update(id, dto);
      return this.buildDivisionRes(row);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to update division");
    }
  }

  @ApiOperation({ summary: "Delete division if it has no districts (admin)" })
  @HttpCode(HttpStatus.OK)
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    try {
      await this.divisionService.remove(id);
      return { message: `Division ${id} deleted successfully` };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to delete division");
    }
  }

  private buildDivisionRes(row: IDivision, withChildren = false): DivisionRes {
    const res: DivisionRes = {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      isActive: row.isActive ?? false,
      createdAt: row.createdAt!,
      updatedAt: row.updatedAt!,
    };

    if (
      withChildren &&
      row.districts &&
      typeof row.districts.isInitialized === "function" &&
      row.districts.isInitialized()
    ) {
      res.districts = [...row.districts].map((d) =>
        this.buildDistrictResNested(d as IDistrict)
      );
    }

    return res;
  }

  private buildDistrictResNested(d: IDistrict): DistrictRes {
    const out: DistrictRes = {
      id: d.id,
      name: d.name,
      description: d.description ?? "",
      isActive: d.isActive ?? false,
      createdAt: d.createdAt!,
      updatedAt: d.updatedAt!,
    };

    if (
      d.subDistricts &&
      typeof d.subDistricts.isInitialized === "function" &&
      d.subDistricts.isInitialized()
    ) {
      out.subDistricts = [...d.subDistricts].map((s) =>
        this.buildSubDistrictResNested(s as ISubDistrict)
      );
    }

    return out;
  }

  private buildSubDistrictResNested(s: ISubDistrict): SubDistrictRes {
    return {
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      isActive: s.isActive ?? false,
      createdAt: s.createdAt!,
      updatedAt: s.updatedAt!,
    };
  }
}
