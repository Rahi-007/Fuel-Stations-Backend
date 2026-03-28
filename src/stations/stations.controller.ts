import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseFloatPipe,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { StationsService } from "./stations.service";

@ApiTags("Stations")
@Controller("stations")
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get()
  @ApiOperation({
    summary: "List stations from database",
    description:
      "Filter by division / district (জেলা) / sub-district (upazila) / village — partial case-insensitive match on linked admin names where present.",
  })
  @ApiQuery({ name: "division", required: false })
  @ApiQuery({ name: "district", required: false })
  @ApiQuery({ name: "subDistrict", required: false })
  @ApiQuery({ name: "village", required: false })
  @ApiQuery({ name: "limit", required: false, example: 200 })
  async list(
    @Query("limit", new DefaultValuePipe(200), ParseIntPipe) limit: number,
    @Query("division") division = "",
    @Query("district") district = "",
    @Query("subDistrict") subDistrict = "",
    @Query("village") village = ""
  ) {
    if (limit < 1 || limit > 500) {
      throw new BadRequestException("limit must be between 1 and 500");
    }
    const stations = await this.stationsService.findStationsFiltered(
      { division, district, subDistrict, village },
      limit
    );
    return {
      count: stations.length,
      stations,
    };
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
      throw new BadRequestException("radius must be between 100 and 25000 meters");
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
}
