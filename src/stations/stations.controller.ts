import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Put,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { StationsService } from "./stations.service";
import {
  NearbyStationsQueryDto,
  NearbyStationsResDto,
  StationAdminRefDto,
  StationRes,
  UpdateStationDto,
} from "./station.dto";
import { IStation } from "./station.entity";

@ApiTags("Stations")
@Controller("stations")
export class StationsController {
  constructor(private readonly stationsService: StationsService) { }

  // @Get()
  // @ApiQuery({ name: "division", required: false })
  // @ApiQuery({ name: "district", required: false })
  // @ApiQuery({ name: "subDistrict", required: false })
  // @ApiQuery({ name: "village", required: false })
  // @ApiQuery({ name: "page", required: false, example: 1 })
  // @ApiQuery({ name: "limit", required: false, example: 20 })
  // async list(
  //   @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
  //   @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  //   @Query("division") division = "",
  //   @Query("district") district = "",
  //   @Query("subDistrict") subDistrict = "",
  //   @Query("village") village = ""
  // ) {
  //   if (limit < 1 || limit > 500) {
  //     throw new BadRequestException("limit must be between 1 and 500");
  //   }

  //   const result = await this.stationsService.findStationsFiltered(
  //     { division, district, subDistrict, village },
  //     { page, limit }
  //   );

  //   return {
  //     ...result,
  //     data: result.data.map((row) => this.stationRowToResponse(row)),
  //   };
  // }
  @Get()
  @ApiOperation({ summary: "Get all stations (filtered + paginated)" })
  @ApiResponse({ status: 200, type: [StationRes] })
  @ApiQuery({ name: "division", required: false })
  @ApiQuery({ name: "district", required: false })
  @ApiQuery({ name: "subDistrict", required: false })
  @ApiQuery({ name: "village", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  async list(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("division") division = "",
    @Query("district") district = "",
    @Query("subDistrict") subDistrict = "",
    @Query("village") village = ""
  ): Promise<{
    data: StationRes[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (limit < 1 || limit > 500) {
      throw new BadRequestException("limit must be between 1 and 500");
    }

    const result = await this.stationsService.findStationsFiltered(
      { division, district, subDistrict, village },
      { page, limit }
    );

    return result; // ✅ NO mapping এখানে
  }

  @Get("nearby")
  @ApiOperation({
    summary: "Nearby fuel stations (OpenStreetMap / Overpass)",
    description:
      "Returns amenity=fuel from OSM within a radius, upserts into DB by unique OSM ref (node|way|id). Data © OpenStreetMap contributors.",
  })
  @ApiResponse({ status: 200, type: NearbyStationsResDto })
  async getNearby(
    @Query() query: NearbyStationsQueryDto
  ): Promise<NearbyStationsResDto> {
    const { lat, lng, radius } = query;
    if (lat < -90 || lat > 90) {
      throw new BadRequestException("lat must be between -90 and 90");
    }
    if (lng < -180 || lng > 180) {
      throw new BadRequestException("lng must be between -180 and 180");
    }
    if (radius < 100 || radius > 25000) {
      throw new BadRequestException(
        "radius must be between 100 and 25000 meters"
      );
    }

    const result = await this.stationsService.fetchNearbySmart(
      lat,
      lng,
      radius
    );

    return {
      source: result.source,
      attribution: "© OpenStreetMap contributors",
      count: result.stations.length,
      stations: result.stations,
      persisted: result.persisted,
    };
  }

  @ApiOperation({ summary: "Get station by ID" })
  @ApiResponse({ status: 200, type: StationRes })
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number): Promise<StationRes> {
    try {
      const row = await this.stationsService.findOneWithChildren(id);
      return this.stationRowToResponse(row);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to fetch station");
    }
  }

  @ApiOperation({ summary: "Update Station by Id" })
  @ApiResponse({ status: 200, type: StationRes })
  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateStationDto
  ): Promise<StationRes> {
    try {
      const row = await this.stationsService.update(id, dto);

      return this.stationRowToResponse(row);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Failed to update station");
    }
  }

  stationRowToResponse(row: IStation): StationRes {
    return {
      id: row.id,
      osmRef: row.osmRef,
      name: row.name ?? undefined,
      brand: row.brand ?? undefined,

      lat: Number(row.lat),
      lng: Number(row.lng),

      division: this.toAdminRef(row.division),
      district: this.toAdminRef(row.district),
      subDistrict: this.toAdminRef(row.subDistrict),

      village: row.village ?? undefined,
      tags: row.tags ?? undefined,

      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toAdminRef(ref: unknown): StationAdminRefDto | undefined {
    if (ref == null || typeof ref !== "object") return undefined;
    const maybe = ref as { id?: unknown; name?: unknown };
    if (typeof maybe.id !== "number" || typeof maybe.name !== "string") {
      return undefined;
    }
    return { id: maybe.id, name: maybe.name };
  }
}
