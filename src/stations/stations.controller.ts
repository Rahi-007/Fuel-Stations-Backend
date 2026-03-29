import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  ParseFloatPipe,
  ParseIntPipe,
  Put,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { StationsService } from "./stations.service";
import { StationRes, UpdateStationDto } from "./station.dto";
import { IStation } from "./station.entity";

@ApiTags("Stations")
@Controller("stations")
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get()
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
  ) {
    if (limit < 1 || limit > 500) {
      throw new BadRequestException("limit must be between 1 and 500");
    }

    const result = await this.stationsService.findStationsFiltered(
      { division, district, subDistrict, village },
      { page, limit }
    );

    return result;
  }

  @Get("nearby")
  @ApiOperation({
    summary: "Nearby fuel stations (OpenStreetMap / Overpass)",
    description:
      "Returns amenity=fuel from OSM within a radius, upserts into DB by unique OSM ref (node|way|id). Data © OpenStreetMap contributors.",
  })
  @ApiQuery({ name: "lat", example: 23.8103 })
  @ApiQuery({ name: "lng", example: 90.4125 })
  @ApiQuery({ name: "radius", required: false, example: 5000 })
  async getNearby(
    @Query("lat", ParseFloatPipe) lat: number,
    @Query("lng", ParseFloatPipe) lng: number,
    @Query("radius", new DefaultValuePipe(5000), ParseIntPipe) radius: number
  ) {
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

    const stations = await this.stationsService.fetchNearbyAndPersist(
      lat,
      lng,
      radius
    );

    return {
      source: "openstreetmap",
      attribution: "© OpenStreetMap contributors",
      count: stations.length,
      stations,
      persisted: true,
    };
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

      division: row.division
        ? { id: row.division.id, name: row.division.name }
        : undefined,

      district: row.district
        ? { id: row.district.id, name: row.district.name }
        : undefined,

      subDistrict: row.subDistrict
        ? { id: row.subDistrict.id, name: row.subDistrict.name }
        : undefined,

      village: row.village ?? undefined,
      tags: row.tags ?? undefined,

      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
