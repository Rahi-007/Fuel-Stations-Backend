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
import { DistrictService } from "./district.service";
import {
  CreateDistrictDto,
  DistrictRes,
  UpdateDistrictDto,
} from "../dto/district.dto";
import { SubDistrictRes } from "../dto/subDistrict.dto";
import { IDistrict } from "../entity/district.entity";
import { IDivision } from "../entity/division.entity";
import { ISubDistrict } from "../entity/subDistrict.entity";
import { Role } from "../../utils/enums";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";

@ApiTags("Locations — Districts")
@Controller("districts")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DistrictController {
  constructor(private readonly districtService: DistrictService) {}

  @ApiOperation({ summary: "List districts (admin)" })
  @ApiResponse({ status: 200, type: DistrictRes, isArray: true })
  @Get()
  async findAll(): Promise<DistrictRes[]> {
    try {
      const rows = await this.districtService.findAll();
      return rows.map((r) => this.buildDistrictRes(r));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to fetch districts");
    }
  }

  @ApiOperation({ summary: "Get district by ID with sub-districts (admin)" })
  @ApiResponse({ status: 200, type: DistrictRes })
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number): Promise<DistrictRes> {
    try {
      const row = await this.districtService.findOneWithChildren(id);
      return this.buildDistrictRes(row, true);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to fetch district");
    }
  }

  @ApiOperation({ summary: "Create district (admin)" })
  @ApiResponse({ status: 201, type: DistrictRes })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() dto: CreateDistrictDto): Promise<DistrictRes> {
    try {
      const row = await this.districtService.create(dto);
      return this.buildDistrictRes(row);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to create district");
    }
  }

  @ApiOperation({ summary: "Update district (admin)" })
  @ApiResponse({ status: 200, type: DistrictRes })
  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateDistrictDto
  ): Promise<DistrictRes> {
    try {
      const row = await this.districtService.update(id, dto);
      return this.buildDistrictRes(row);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to update district");
    }
  }

  @ApiOperation({ summary: "Delete district if unused (admin)" })
  @HttpCode(HttpStatus.OK)
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    try {
      await this.districtService.remove(id);
      return { message: `District ${id} deleted successfully` };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to delete district");
    }
  }

  private buildDivisionSummary(row: IDivision | null | undefined) {
    if (row == null || typeof row !== "object") return undefined;
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      isActive: row.isActive ?? false,
      createdAt: row.createdAt!,
      updatedAt: row.updatedAt!,
    };
  }

  private buildDistrictRes(row: IDistrict, withSubs = false): DistrictRes {
    const res: DistrictRes = {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      isActive: row.isActive ?? false,
      createdAt: row.createdAt!,
      updatedAt: row.updatedAt!,
      division: this.buildDivisionSummary(row.division as IDivision),
    };

    if (
      withSubs &&
      row.subDistricts &&
      typeof row.subDistricts.isInitialized === "function" &&
      row.subDistricts.isInitialized()
    ) {
      res.subDistricts = [...row.subDistricts].map((s) =>
        this.mapSub(s as ISubDistrict)
      );
    }

    return res;
  }

  private mapSub(s: ISubDistrict): SubDistrictRes {
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
