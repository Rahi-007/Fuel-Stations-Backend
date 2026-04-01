import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { StationsService } from "./stations.service";
import {
  CommentRes,
  CreateCommentDto,
  CreateStationFollowDto,
  CreateStationLikeDto,
  FuelPricesDto,
  FuelTypesDto,
  NearbyStationsQueryDto,
  NearbyStationsResDto,
  StationAdminRefDto,
  StationRes,
  UserRefDto,
  UpdateStationDto,
} from "./station.dto";
import { IStation } from "./station.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Stations")
@Controller("stations")
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

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

    return result;
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

  @UseGuards(JwtAuthGuard)
  @Post("like")
  @ApiOperation({ summary: "Like a station" })
  async likeStation(
    @Body() dto: CreateStationLikeDto,
    @Request() req: { user?: { sub?: unknown; id?: unknown } }
  ): Promise<{ message: string }> {
    const userId = this.extractUserId(req);
    await this.stationsService.likeStation(userId, dto.stationId);
    return { message: "Station liked successfully" };
  }

  @UseGuards(JwtAuthGuard)
  @Delete("like/:stationId")
  @ApiOperation({ summary: "Unlike a station" })
  async unlikeStation(
    @Param("stationId", ParseIntPipe) stationId: number,
    @Request() req: { user?: { sub?: unknown; id?: unknown } }
  ): Promise<{ message: string }> {
    const userId = this.extractUserId(req);
    await this.stationsService.unlikeStation(userId, stationId);
    return { message: "Station unliked successfully" };
  }

  @UseGuards(JwtAuthGuard)
  @Post("follow")
  @ApiOperation({ summary: "Follow a station" })
  async followStation(
    @Body() dto: CreateStationFollowDto,
    @Request() req: { user?: { sub?: unknown; id?: unknown } }
  ): Promise<{ message: string }> {
    const userId = this.extractUserId(req);
    await this.stationsService.followStation(userId, dto.stationId);
    return { message: "Station followed successfully" };
  }

  @UseGuards(JwtAuthGuard)
  @Delete("follow/:stationId")
  @ApiOperation({ summary: "Unfollow a station" })
  async unfollowStation(
    @Param("stationId", ParseIntPipe) stationId: number,
    @Request() req: { user?: { sub?: unknown; id?: unknown } }
  ): Promise<{ message: string }> {
    const userId = this.extractUserId(req);
    await this.stationsService.unfollowStation(userId, stationId);
    return { message: "Station unfollowed successfully" };
  }

  @UseGuards(JwtAuthGuard)
  @Post("comment")
  @ApiOperation({ summary: "Create station comment" })
  async createComment(
    @Body() dto: CreateCommentDto,
    @Request() req: { user?: { sub?: unknown; id?: unknown } }
  ): Promise<CommentRes> {
    const userId = this.extractUserId(req);
    return this.stationsService.createComment(userId, dto);
  }

  @Get(":id/comments")
  @ApiOperation({ summary: "Get comments by station ID" })
  async getCommentsByStation(
    @Param("id", ParseIntPipe) stationId: number
  ): Promise<CommentRes[]> {
    return this.stationsService.getCommentsByStation(stationId);
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

      avatar: row.avatar ?? undefined,
      fuelTypes: ((row.fuelTypes ?? undefined) as unknown as FuelTypesDto | undefined),
      prices: ((row.prices ?? undefined) as unknown as FuelPricesDto | undefined),
      status: row.status ?? undefined,
      queueStatus: row.queueStatus ?? undefined,
      openingTime: row.openingTime ?? undefined,
      googleMapLink: row.googleMapLink ?? undefined,
      description: row.description ?? undefined,
      adminNote: row.adminNote ?? undefined,
      likesCount: Number(row.likesCount ?? 0),
      followersCount: Number(row.followersCount ?? 0),
      lastUpdatedBy: this.toUserRef(row.lastUpdatedBy),

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

  private toUserRef(ref: unknown): UserRefDto | undefined {
    if (ref == null || typeof ref !== "object") return undefined;
    const maybe = ref as { id?: unknown; name?: unknown };
    if (typeof maybe.id !== "number" || typeof maybe.name !== "string") {
      return undefined;
    }
    return { id: maybe.id, name: maybe.name };
  }

  private extractUserId(req: {
    user?: { sub?: unknown; id?: unknown };
  }): number {
    const candidate = req.user?.sub ?? req.user?.id;
    const userId = Number(candidate);
    if (!Number.isInteger(userId) || userId < 1) {
      throw new BadRequestException("Invalid authenticated user");
    }
    return userId;
  }
}
