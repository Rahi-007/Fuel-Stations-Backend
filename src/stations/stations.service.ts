import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { EntityManager, FilterQuery } from "@mikro-orm/core";
import axios, { AxiosError } from "axios";
import {
  CommentSchema,
  StationFollowSchema,
  StationLikeSchema,
  StationSchema,
  type IComment,
  type IStation,
} from "./station.entity";
import {
  StationUpdateRequestSchema,
  type IStationUpdateRequest,
  UpdateRequestStatus,
} from "./station-update-request.entity";
import { extractAdminFromOsmTags } from "./osm-admin.util";
import {
  DivisionSchema,
  type IDivision,
} from "../location/entity/division.entity";
import {
  DistrictSchema,
  type IDistrict,
} from "../location/entity/district.entity";
import {
  SubDistrictSchema,
  type ISubDistrict,
} from "../location/entity/subDistrict.entity";
import {
  type CommentRes,
  type CreateCommentDto,
  CreateStationUpdateRequestDto,
  FuelPricesDto,
  FuelTypesDto,
  GetCommentsQueryDto,
  StationAdminRefDto,
  StationRes,
  StationUpdateRequestRes,
  type UserRefDto,
  UpdateStationDto,
  UpdateStationUpdateRequestDto,
} from "./station.dto";
import { UserSchema } from "../auth/entity/user.entity";

/** Public instances — primary is often busy; fallbacks improve reliability. */
const OVERPASS_INTERPRETERS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
] as const;

export function buildOsmRef(osmType: string, osmId: number): string {
  return `${osmType}/${osmId}`;
}

export interface FuelStationFromOsm {
  osmId: number;
  osmType: "node" | "way" | "relation";
  name: string | null;
  brand: string | null;
  lat: number;
  lng: number;
  tags: Record<string, string>;
  division: string | null;
  district: string | null;
  subDistrict: string | null;
  village: string | null;
  status?: string | null; // Add status field
}

/** After DB sync — includes internal primary key. */
export interface FuelStationResponse extends FuelStationFromOsm {
  id: number;
  status?: string | null; // Add status field
}

export interface NearbyStationsResult {
  source: "database" | "openstreetmap" | "database+openstreetmap";
  stations: FuelStationResponse[];
  persisted: boolean;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

type AdminResolveCaches = {
  divisions: Map<string, IDivision | null>;
  districts: Map<string, IDistrict | null>;
  subDistricts: Map<string, ISubDistrict | null>;
};

@Injectable()
export class StationsService {
  private readonly logger = new Logger(StationsService.name);

  constructor(private readonly em: EntityManager) {}

  buildFuelAroundQuery(lat: number, lng: number, radiusMeters: number): string {
    return `[out:json][timeout:25];
(
  node["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
  way["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
  relation["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
);
out center;`;
  }

  normalizeElements(elements: OverpassElement[]): FuelStationFromOsm[] {
    const out: FuelStationFromOsm[] = [];
    for (const el of elements) {
      let lat: number | undefined;
      let lng: number | undefined;
      if (el.type === "node" && el.lat != null && el.lon != null) {
        lat = el.lat;
        lng = el.lon;
      } else if (el.center?.lat != null && el.center?.lon != null) {
        lat = el.center.lat;
        lng = el.center.lon;
      }
      if (lat == null || lng == null) continue;

      const tags = el.tags ?? {};
      const admin = extractAdminFromOsmTags(tags);
      out.push({
        osmId: el.id,
        osmType: el.type,
        name: tags.name ?? tags["name:en"] ?? null,
        brand: tags.brand ?? null,
        lat,
        lng,
        tags,
        ...admin,
      });
    }
    return out;
  }

  private isOverpassRetryable(ax: AxiosError): boolean {
    const status = ax.response?.status;
    if (status === 429) return true;
    if (status != null && status >= 500) return true;
    if (
      ax.code === "ECONNABORTED" ||
      ax.code === "ECONNRESET" ||
      ax.code === "ETIMEDOUT" ||
      ax.code === "ECONNREFUSED"
    ) {
      return true;
    }
    return ax.response == null;
  }

  async fetchNearbyFuelStations(
    lat: number,
    lng: number,
    radiusMeters: number
  ): Promise<FuelStationFromOsm[]> {
    const query = this.buildFuelAroundQuery(lat, lng, radiusMeters);
    const attemptsLog: string[] = [];

    for (const url of OVERPASS_INTERPRETERS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const { data } = await axios.post<OverpassResponse>(url, query, {
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
            timeout: 35_000,
            validateStatus: (s) => s === 200,
          });

          if (!data?.elements?.length) {
            return [];
          }

          return this.normalizeElements(data.elements);
        } catch (err) {
          const ax = err as AxiosError;
          const status = ax.response?.status;
          const snippet = ax.response?.data
            ? String(ax.response.data).slice(0, 200)
            : "";
          attemptsLog.push(
            `${url} (${ax.message}${status ? ` ${status}` : ""})`
          );
          this.logger.warn(
            `Overpass request failed: ${attemptsLog.at(-1)}`,
            snippet
          );

          if (this.isOverpassRetryable(ax) && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1_000));
            continue;
          }
          break;
        }
      }
    }

    this.logger.warn(`All Overpass mirrors failed: ${attemptsLog.join(" | ")}`);
    throw new ServiceUnavailableException(
      "Could not reach OpenStreetMap Overpass. Try again in a moment."
    );
  }

  private normalizeAdminLabel(label: string | null | undefined): string | null {
    const t = label?.trim();
    return t ? t.toLowerCase() : null;
  }

  private relationName(ref: unknown): string | null {
    if (ref == null) return null;
    if (typeof ref === "object" && "name" in ref) {
      const n = (ref as { name: unknown }).name;
      return typeof n === "string" ? n : null;
    }
    return null;
  }

  private distanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6_371_000;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async findNearbyFromDb(
    lat: number,
    lng: number,
    radiusMeters: number
  ): Promise<FuelStationResponse[]> {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const radiusNum = Number(radiusMeters);

    if (
      !Number.isFinite(latNum) ||
      !Number.isFinite(lngNum) ||
      !Number.isFinite(radiusNum)
    ) {
      throw new BadRequestException(
        "lat, lng and radius must be valid numbers"
      );
    }

    // Fast pre-filter with a lat/lng bounding box, then exact distance check.
    const latDelta = radiusNum / 111_320;
    const lngDelta =
      radiusNum / (111_320 * Math.cos((latNum * Math.PI) / 180) || 1);

    const rows = await this.em.find(
      StationSchema,
      {
        lat: { $gte: latNum - latDelta, $lte: latNum + latDelta },
        lng: { $gte: lngNum - lngDelta, $lte: lngNum + lngDelta },
      },
      { populate: ["division", "district", "subDistrict"] as const, limit: 500 }
    );

    return rows
      .map((row) => ({
        row,
        dist: this.distanceMeters(
          latNum,
          lngNum,
          Number(row.lat),
          Number(row.lng)
        ),
      }))
      .filter((x) => x.dist <= radiusNum)
      .sort((a, b) => a.dist - b.dist)
      .map((x) => this.stationRowToResponse(x.row));
  }

  private dedupeByOsmRef(stations: FuelStationFromOsm[]): FuelStationFromOsm[] {
    const unique = new Map<string, FuelStationFromOsm>();
    for (const s of stations) {
      unique.set(buildOsmRef(s.osmType, s.osmId), s);
    }
    return [...unique.values()];
  }

  private async resolveDivisionForOsm(
    label: string | null,
    cache: Map<string, IDivision | null>
  ): Promise<IDivision | null> {
    const k = this.normalizeAdminLabel(label);
    if (!k) return null;
    if (cache.has(k)) return cache.get(k)!;
    const trimmed = label!.trim();
    const row = await this.em.findOne(DivisionSchema, {
      isActive: true,
      name: { $ilike: trimmed },
    });
    const resolved = row ?? null;
    cache.set(k, resolved);
    return resolved;
  }

  private async resolveDistrictForOsm(
    division: IDivision | null,
    label: string | null,
    cache: Map<string, IDistrict | null>
  ): Promise<IDistrict | null> {
    const k = this.normalizeAdminLabel(label);
    if (!division || !k) return null;
    const ck = `${division.id}:${k}`;
    if (cache.has(ck)) return cache.get(ck)!;
    const trimmed = label!.trim();
    const row = await this.em.findOne(DistrictSchema, {
      isActive: true,
      division,
      name: { $ilike: trimmed },
    });
    const resolved = row ?? null;
    cache.set(ck, resolved);
    return resolved;
  }

  private async resolveSubDistrictForOsm(
    district: IDistrict | null,
    label: string | null,
    cache: Map<string, ISubDistrict | null>
  ): Promise<ISubDistrict | null> {
    const k = this.normalizeAdminLabel(label);
    if (!district || !k) return null;
    const ck = `${district.id}:${k}`;
    if (cache.has(ck)) return cache.get(ck)!;
    const trimmed = label!.trim();
    const row = await this.em.findOne(SubDistrictSchema, {
      isActive: true,
      district,
      name: { $ilike: trimmed },
    });
    const resolved = row ?? null;
    cache.set(ck, resolved);
    return resolved;
  }

  private async resolveAdminRelations(
    s: FuelStationFromOsm,
    caches: AdminResolveCaches
  ): Promise<{
    division: IDivision | null;
    district: IDistrict | null;
    subDistrict: ISubDistrict | null;
  }> {
    const division = await this.resolveDivisionForOsm(
      s.division,
      caches.divisions
    );
    const district = await this.resolveDistrictForOsm(
      division,
      s.district,
      caches.districts
    );
    const subDistrict = await this.resolveSubDistrictForOsm(
      district,
      s.subDistrict,
      caches.subDistricts
    );
    return { division, district, subDistrict };
  }

  /**
   * Deduplicate Overpass rows, upsert by unique osmRef (no duplicate stations).
   * New rows inserted; existing rows get lat/lng/name/brand/tags refreshed from OSM.
   * Division / district / sub-district link to admin location rows when names match (case-insensitive).
   */
  async persistOsmStations(stations: FuelStationFromOsm[]): Promise<void> {
    if (!stations.length) return;

    const list = this.dedupeByOsmRef(stations);
    const refs = list.map((s) => buildOsmRef(s.osmType, s.osmId));

    const existing = await this.em.find(StationSchema, {
      osmRef: { $in: refs },
    });
    const byRef = new Map(existing.map((row) => [row.osmRef, row]));

    const caches: AdminResolveCaches = {
      divisions: new Map(),
      districts: new Map(),
      subDistricts: new Map(),
    };

    for (const s of list) {
      const { division, district, subDistrict } =
        await this.resolveAdminRelations(s, caches);
      const ref = buildOsmRef(s.osmType, s.osmId);
      const row = byRef.get(ref);
      if (row) {
        row.lat = s.lat;
        row.lng = s.lng;
        if (s.name != null) row.name = s.name;
        if (s.brand != null) row.brand = s.brand;
        row.tags = s.tags;
        row.division = division || undefined;
        row.district = district || undefined;
        row.subDistrict = subDistrict || undefined;
        if (s.village != null) row.village = s.village;
        continue;
      }
      const created = this.em.create(StationSchema, {
        osmRef: ref,
        name: s.name,
        brand: s.brand,
        lat: s.lat,
        lng: s.lng,
        tags: s.tags,
        fuelTypes: null,
        prices: null,
        division,
        district,
        subDistrict,
        village: s.village,
      } as any);
      byRef.set(ref, created);
    }

    await this.em.flush();
  }

  async fetchNearbyAndPersist(
    lat: number,
    lng: number,
    radiusMeters: number
  ): Promise<FuelStationResponse[]> {
    const raw = await this.fetchNearbyFuelStations(lat, lng, radiusMeters);
    await this.persistOsmStations(raw);

    const list = this.dedupeByOsmRef(raw);

    const refs = list.map((s) => buildOsmRef(s.osmType, s.osmId));
    if (!refs.length) return [];

    const rows = await this.em.find(
      StationSchema,
      {
        osmRef: { $in: refs },
      },
      { populate: ["division", "district", "subDistrict"] as const }
    );
    const byRef = new Map(rows.map((r) => [r.osmRef, r]));

    return list.map((s) => {
      const ref = buildOsmRef(s.osmType, s.osmId);
      const r = byRef.get(ref);
      if (!r) {
        this.logger.error(`Station missing after persist for ${ref}`);
        throw new Error(`Persist inconsistency for ${ref}`);
      }
      return {
        id: r.id,
        osmId: s.osmId,
        osmType: s.osmType,
        name: s.name,
        brand: s.brand,
        lat: s.lat,
        lng: s.lng,
        tags: s.tags,
        division: this.relationName(r.division) ?? s.division,
        district: this.relationName(r.district) ?? s.district,
        subDistrict: this.relationName(r.subDistrict) ?? s.subDistrict,
        village: r.village ?? s.village,
      };
    });
  }

  async fetchNearbySmart(
    lat: number,
    lng: number,
    radiusMeters: number
  ): Promise<NearbyStationsResult> {
    const dbStations = await this.findNearbyFromDb(lat, lng, radiusMeters);
    if (dbStations.length >= 8) {
      return { source: "database", stations: dbStations, persisted: false };
    }

    try {
      const osmStations = await this.fetchNearbyAndPersist(
        lat,
        lng,
        radiusMeters
      );
      const merged = new Map<number, FuelStationResponse>();
      for (const s of dbStations) merged.set(s.id, s);
      for (const s of osmStations) merged.set(s.id, s);
      const stations = [...merged.values()];
      return {
        source: dbStations.length ? "database+openstreetmap" : "openstreetmap",
        stations,
        persisted: true,
      };
    } catch (error) {
      if (dbStations.length) {
        this.logger.warn(
          "OSM fetch failed; returned cached DB nearby stations instead."
        );
        return { source: "database", stations: dbStations, persisted: false };
      }
      throw error;
    }
  }

  /**
   * List persisted stations with optional case-insensitive partial match filters
   * on linked division / district / sub-district names (and village text).
   */
  async findStationsFiltered(
    filters: {
      division?: string;
      district?: string;
      subDistrict?: string;
      village?: string;
    },
    params: {
      page: number;
      limit: number;
    }
  ): Promise<{
    data: StationRes[];
    total: number;
    page: number;
    limit: number;
  }> {
    const cond: FilterQuery<IStation> = {};

    const v = (x?: string) => x?.trim();

    const div = v(filters.division);
    const dist = v(filters.district);
    const sub = v(filters.subDistrict);
    const vil = v(filters.village);

    if (div) cond.division = { name: { $ilike: `%${div}%` } };
    if (dist) cond.district = { name: { $ilike: `%${dist}%` } };
    if (sub) cond.subDistrict = { name: { $ilike: `%${sub}%` } };
    if (vil) cond.village = { $ilike: `%${vil}%` };

    const limit = Math.min(Math.max(params.limit, 1), 500);
    const offset = (params.page - 1) * limit;

    const total = await this.em.count(StationSchema, cond);

    const rows = await this.em.find(StationSchema, cond, {
      limit,
      offset,
      orderBy: { id: "DESC" },
      populate: [
        "division",
        "district",
        "subDistrict",
        "lastUpdatedBy",
      ] as const,
    });

    return {
      data: rows.map((r) => this.stationRowToResponse2(r)), // ✅ mapping এখানে
      total,
      page: params.page,
      limit,
    };
  }

  async findOneWithChildren(id: number): Promise<IStation> {
    const row = await this.em.findOne(
      StationSchema,
      { id },
      {
        populate: [
          "division",
          "subDistrict",
          "district",
          "lastUpdatedBy",
        ] as const,
      }
    );
    if (!row) {
      throw new NotFoundException(`Station with ID ${id} not found`);
    }
    return row;
  }

  private async resolveDivisionForUpdate(id: number) {
    const division = await this.em.findOne(DivisionSchema, { id });
    if (!division) {
      throw new NotFoundException(`Division with ID ${id} not found`);
    }
    return division;
  }

  private async resolveDistrictForUpdate(id: number) {
    const district = await this.em.findOne(DistrictSchema, { id });
    if (!district) {
      throw new NotFoundException(`District with ID ${id} not found`);
    }
    return district;
  }

  private async resolveSubDistrictForUpdate(id: number) {
    const subDistrict = await this.em.findOne(SubDistrictSchema, { id });
    if (!subDistrict) {
      throw new NotFoundException(`SubDistrict with ID ${id} not found`);
    }
    return subDistrict;
  }

  private validateRelationConsistency(row: IStation): void {
    if (
      row.district &&
      row.division &&
      row.district.division?.id !== row.division.id
    ) {
      throw new BadRequestException(
        "District does not belong to selected division"
      );
    }

    if (
      row.subDistrict &&
      row.district &&
      row.subDistrict.district?.id !== row.district.id
    ) {
      throw new BadRequestException(
        "SubDistrict does not belong to selected district"
      );
    }
  }

  private applyBasicFields(row: IStation, dto: UpdateStationDto): void {
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.brand !== undefined) row.brand = dto.brand;
    if (dto.lat !== undefined) row.lat = dto.lat;
    if (dto.lng !== undefined) row.lng = dto.lng;
    if (dto.village !== undefined) row.village = dto.village;
    if (dto.tags !== undefined) row.tags = dto.tags;
    if (dto.avatar !== undefined) row.avatar = dto.avatar;
    if (dto.fuelTypes !== undefined)
      row.fuelTypes = dto.fuelTypes as unknown as object;
    if (dto.prices !== undefined) row.prices = dto.prices as unknown as object;
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.queueStatus !== undefined) row.queueStatus = dto.queueStatus;
    if (dto.openingTime !== undefined) row.openingTime = dto.openingTime;
    if (dto.googleMapLink !== undefined) row.googleMapLink = dto.googleMapLink;
    if (dto.description !== undefined) row.description = dto.description;
    if (dto.adminNote !== undefined) row.adminNote = dto.adminNote;
  }

  async update(id: number, dto: UpdateStationDto): Promise<IStation> {
    const row = await this.em.findOne(
      StationSchema,
      { id },
      {
        populate: [
          "division",
          "district",
          "subDistrict",
          "lastUpdatedBy",
        ] as const,
      }
    );

    if (!row) {
      throw new NotFoundException(`Station with ID ${id} not found`);
    }

    if (dto.divisionId !== undefined) {
      if (dto.divisionId === null) {
        row.division = undefined;
      } else if (dto.divisionId !== row.division?.id) {
        row.division = await this.resolveDivisionForUpdate(dto.divisionId);
      }
    }

    if (dto.districtId !== undefined) {
      if (dto.districtId === null) {
        row.district = undefined;
      } else if (dto.districtId !== row.district?.id) {
        row.district = await this.resolveDistrictForUpdate(dto.districtId);
      }
    }

    if (dto.subDistrictId !== undefined) {
      if (dto.subDistrictId === null) {
        row.subDistrict = undefined;
      } else if (dto.subDistrictId !== row.subDistrict?.id) {
        row.subDistrict = await this.resolveSubDistrictForUpdate(
          dto.subDistrictId
        );
      }
    }

    this.validateRelationConsistency(row);
    this.applyBasicFields(row, dto);
    if (dto.lastUpdatedById !== undefined) {
      const user = await this.em.findOne(UserSchema, {
        id: dto.lastUpdatedById,
      });
      if (!user) {
        throw new NotFoundException(
          `User with ID ${dto.lastUpdatedById} not found`
        );
      }
      row.lastUpdatedBy = user;
    }

    row.updatedAt = new Date();

    await this.em.flush();

    return row;
  }

  async likeStation(userId: number, stationId: number): Promise<void> {
    const station = await this.em.findOne(StationSchema, { id: stationId });
    if (!station)
      throw new NotFoundException(`Station with ID ${stationId} not found`);
    const user = await this.em.findOne(UserSchema, { id: userId });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    const existing = await this.em.findOne(StationLikeSchema, {
      station,
      user,
    });
    if (existing) return;

    this.em.create(StationLikeSchema, { station, user } as any);
    station.likesCount = (station.likesCount ?? 0) + 1;
    await this.em.flush();
  }

  async unlikeStation(userId: number, stationId: number): Promise<void> {
    const station = await this.em.findOne(StationSchema, { id: stationId });
    if (!station)
      throw new NotFoundException(`Station with ID ${stationId} not found`);
    const user = await this.em.findOne(UserSchema, { id: userId });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    const existing = await this.em.findOne(StationLikeSchema, {
      station,
      user,
    });
    if (!existing) return;

    this.em.remove(existing);
    station.likesCount = Math.max((station.likesCount ?? 0) - 1, 0);
    await this.em.flush();
  }

  async isLiked(userId: number, stationId: number): Promise<boolean> {
    const station = await this.em.findOne(StationSchema, { id: stationId });
    if (!station)
      throw new NotFoundException(`Station with ID ${stationId} not found`);
    const user = await this.em.findOne(UserSchema, { id: userId });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    const existing = await this.em.findOne(StationLikeSchema, {
      station,
      user,
    });
    return !!existing;
  }

  async followStation(userId: number, stationId: number): Promise<void> {
    const station = await this.em.findOne(StationSchema, { id: stationId });
    if (!station)
      throw new NotFoundException(`Station with ID ${stationId} not found`);
    const user = await this.em.findOne(UserSchema, { id: userId });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    const existing = await this.em.findOne(StationFollowSchema, {
      station,
      user,
    });
    if (existing) return;

    this.em.create(StationFollowSchema, { station, user } as any);
    station.followersCount = (station.followersCount ?? 0) + 1;
    await this.em.flush();
  }

  async isFollowed(userId: number, stationId: number): Promise<boolean> {
    const station = await this.em.findOne(StationSchema, { id: stationId });
    if (!station)
      throw new NotFoundException(`Station with ID ${stationId} not found`);
    const user = await this.em.findOne(UserSchema, { id: userId });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    const existing = await this.em.findOne(StationFollowSchema, {
      station,
      user,
    });
    return !!existing;
  }

  async unfollowStation(userId: number, stationId: number): Promise<void> {
    const station = await this.em.findOne(StationSchema, { id: stationId });
    if (!station)
      throw new NotFoundException(`Station with ID ${stationId} not found`);
    const user = await this.em.findOne(UserSchema, { id: userId });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    const existing = await this.em.findOne(StationFollowSchema, {
      station,
      user,
    });
    if (!existing) return;

    this.em.remove(existing);
    station.followersCount = Math.max((station.followersCount ?? 0) - 1, 0);
    await this.em.flush();
  }

  async createComment(
    userId: number,
    dto: CreateCommentDto
  ): Promise<CommentRes> {
    const station = await this.em.findOne(StationSchema, { id: dto.stationId });
    if (!station)
      throw new NotFoundException(`Station with ID ${dto.stationId} not found`);
    const user = await this.em.findOne(UserSchema, { id: userId });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    let parent: IComment | null = null;
    if (dto.parentId != null) {
      const row = await this.em.findOne(
        CommentSchema,
        { id: dto.parentId },
        { populate: ["station"] as const }
      );
      if (!row) {
        throw new NotFoundException(
          `Comment with ID ${dto.parentId} not found`
        );
      }
      if (row.station.id !== station.id) {
        throw new BadRequestException(
          "Reply must belong to the same station thread"
        );
      }
      parent = row;
    }

    const comment = this.em.create(CommentSchema, {
      text: dto.text,
      station,
      user,
      parent: parent ?? undefined,
    } as any);
    await this.em.flush();
    await this.em.populate(comment, ["user", "station", "parent"] as const);

    return this.mapCommentToRes(comment);
  }

  async getCommentsByStation(
    stationId: number,
    query?: GetCommentsQueryDto
  ): Promise<{
    data: CommentRes[];
    total: number;
    page: number;
    limit: number;
  }> {
    const station = await this.em.findOne(StationSchema, { id: stationId });
    if (!station)
      throw new NotFoundException(`Station with ID ${stationId} not found`);

    const filter = query?.filter || "all";
    const page = query?.page || 1;
    const limit = Math.min(Math.max(query?.limit || 30, 1), 100);
    const userId = query?.userId;

    // Get ALL comments (both parents and replies) for this station
    const allComments = await this.em.find(
      CommentSchema,
      { station },
      {
        populate: ["user", "station", "parent"] as const,
        orderBy: { createdAt: "asc" },
      }
    );

    // Separate parent comments (top-level) and replies
    const commentIdSet = new Set(allComments.map((c) => c.id));
    let topLevelComments = allComments.filter(
      (c) => !c.parent || !commentIdSet.has(c.parent.id)
    );

    // Apply filters ONLY to top-level comments
    if (filter === "my" && userId) {
      topLevelComments = topLevelComments.filter((c) => c.user.id === userId);
    } else if (filter === "newest") {
      topLevelComments = [...topLevelComments].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    } else if (filter === "oldest") {
      topLevelComments = [...topLevelComments].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
    } else if (filter === "mostReply") {
      topLevelComments = [...topLevelComments].sort((a, b) => {
        const replyCountA = allComments.filter(
          (c) => c.parent?.id === a.id
        ).length;
        const replyCountB = allComments.filter(
          (c) => c.parent?.id === b.id
        ).length;
        return replyCountB - replyCountA;
      });
    } else if (filter === "all") {
      // Default: newest first
      topLevelComments = [...topLevelComments].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    }

    const total = topLevelComments.length;
    const offset = (page - 1) * limit;
    const paginatedTopLevel = topLevelComments.slice(offset, offset + limit);

    // IMPORTANT: Include ALL replies (nested) for the paginated parent comments
    // This ensures frontend can display complete threads with all nested replies
    const parentIds = new Set(paginatedTopLevel.map((c) => c.id));

    // Helper function to recursively find all replies for given parent IDs
    const findAllRepliesRecursive = (
      parentCommentIds: Set<number>,
      depth = 0
    ): IComment[] => {
      if (parentCommentIds.size === 0 || depth > 20) return []; // Prevent infinite recursion

      const directReplies = allComments.filter(
        (c) => c.parent && parentCommentIds.has(c.parent.id)
      );

      if (directReplies.length === 0) return [];

      // Find replies to these replies (recursive)
      const replyIds = new Set(directReplies.map((c) => c.id));
      const nestedReplies = findAllRepliesRecursive(replyIds, depth + 1);

      return [...directReplies, ...nestedReplies];
    };

    const allReplies = findAllRepliesRecursive(parentIds);

    // Combine paginated parents with ALL their nested replies
    const resultComments = [...paginatedTopLevel, ...allReplies];

    return {
      data: resultComments.map((comment) => this.mapCommentToRes(comment)),
      total,
      page,
      limit,
    };
  }

  private mapCommentToRes(comment: {
    id: number;
    text: string;
    createdAt: Date;
    user: {
      id: number;
      firstName: string;
      lastName?: string | null;
      avatar?: string | null;
    };
    station: { id: number };
    parent?: { id: number } | null;
  }): CommentRes {
    const u = comment.user;
    const displayName =
      [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
      `User #${u.id}`;
    return {
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      userId: u.id,
      stationId: comment.station.id,
      parentId: comment.parent?.id,
      user: {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName ?? undefined,
        name: displayName,
        avatar: u.avatar ?? undefined,
      },
    };
  }

  private stationRowToResponse(r: IStation): FuelStationResponse {
    const slash = r.osmRef.indexOf("/");
    const osmType =
      slash >= 0
        ? (r.osmRef.slice(0, slash) as "node" | "way" | "relation")
        : "node";
    const osmId = slash >= 0 ? Number(r.osmRef.slice(slash + 1)) : 0;
    const tags = (r.tags as Record<string, string> | null) ?? {};
    const typeOk =
      osmType === "node" || osmType === "way" || osmType === "relation";
    return {
      id: r.id,
      osmId: Number.isFinite(osmId) ? osmId : 0,
      osmType: typeOk ? osmType : "node",
      name: r.name ?? null,
      brand: r.brand ?? null,
      lat: Number(r.lat),
      lng: Number(r.lng),
      tags,
      division: this.relationName(r.division),
      district: this.relationName(r.district),
      subDistrict: this.relationName(r.subDistrict),
      village: r.village ?? null,
      status: r.status ?? null, // Add status from database
    };
  }
  private stationRowToResponse2(row: IStation): StationRes {
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
      fuelTypes: (row.fuelTypes ?? undefined) as unknown as
        | FuelTypesDto
        | undefined,
      prices: (row.prices ?? undefined) as unknown as FuelPricesDto | undefined,
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

  // Station Update Request Methods

  async createStationUpdateRequest(
    dto: CreateStationUpdateRequestDto,
    userId: number
  ): Promise<StationUpdateRequestRes> {
    const em = this.em.fork();

    // Check if station exists
    const station = await em.findOne(StationSchema, { id: dto.stationId });
    if (!station) {
      throw new NotFoundException(`Station with ID ${dto.stationId} not found`);
    }

    // Check if user exists
    const user = await em.findOne(UserSchema, { id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updateRequest = new StationUpdateRequestSchema();
    updateRequest.station = station;
    updateRequest.requestedBy = user;
    updateRequest.changes = dto.changes;
    updateRequest.status = UpdateRequestStatus.PENDING;

    await em.persistAndFlush(updateRequest);

    return this.stationUpdateRequestToResponse(updateRequest);
  }

  async approveStationUpdateRequest(
    requestId: number,
    dto: UpdateStationUpdateRequestDto,
    adminUserId: number
  ): Promise<StationUpdateRequestRes> {
    const em = this.em.fork();

    const updateRequest = await em.findOne(
      StationUpdateRequestSchema,
      { id: requestId },
      { populate: ["station", "requestedBy"] }
    );

    if (!updateRequest) {
      throw new NotFoundException(
        `Update request with ID ${requestId} not found`
      );
    }

    if (updateRequest.status !== UpdateRequestStatus.PENDING) {
      throw new BadRequestException(
        `Update request is already ${updateRequest.status}`
      );
    }

    const adminUser = await em.findOne(UserSchema, { id: adminUserId });
    if (!adminUser) {
      throw new NotFoundException(
        `Admin user with ID ${adminUserId} not found`
      );
    }

    // Update the station with the proposed changes
    const station = updateRequest.station;
    const changes = updateRequest.changes;

    // Apply changes to station (only allowed fields)
    if (changes.name !== undefined) station.name = changes.name;
    if (changes.brand !== undefined) station.brand = changes.brand;
    if (changes.lat !== undefined) station.lat = changes.lat;
    if (changes.lng !== undefined) station.lng = changes.lng;
    if (changes.village !== undefined) station.village = changes.village;
    if (changes.avatar !== undefined) station.avatar = changes.avatar;
    if (changes.fuelTypes !== undefined) station.fuelTypes = changes.fuelTypes;
    if (changes.prices !== undefined) station.prices = changes.prices;
    if (changes.status !== undefined) station.status = changes.status;
    if (changes.queueStatus !== undefined)
      station.queueStatus = changes.queueStatus;
    if (changes.openingTime !== undefined)
      station.openingTime = changes.openingTime;
    if (changes.googleMapLink !== undefined)
      station.googleMapLink = changes.googleMapLink;
    if (changes.description !== undefined)
      station.description = changes.description;
    if (changes.adminNote !== undefined) station.adminNote = changes.adminNote;

    // Update lastUpdatedBy
    station.lastUpdatedBy = adminUser;

    // Update the request status
    updateRequest.status = dto.status;
    updateRequest.adminNote = dto.adminNote;
    updateRequest.reviewedBy = adminUser;
    updateRequest.reviewedAt = new Date();

    await em.persistAndFlush([station, updateRequest]);

    return this.stationUpdateRequestToResponse(updateRequest);
  }

  async rejectStationUpdateRequest(
    requestId: number,
    dto: UpdateStationUpdateRequestDto,
    adminUserId: number
  ): Promise<StationUpdateRequestRes> {
    const em = this.em.fork();

    const updateRequest = await em.findOne(
      StationUpdateRequestSchema,
      { id: requestId },
      { populate: ["station", "requestedBy"] }
    );

    if (!updateRequest) {
      throw new NotFoundException(
        `Update request with ID ${requestId} not found`
      );
    }

    if (updateRequest.status !== UpdateRequestStatus.PENDING) {
      throw new BadRequestException(
        `Update request is already ${updateRequest.status}`
      );
    }

    const adminUser = await em.findOne(UserSchema, { id: adminUserId });
    if (!adminUser) {
      throw new NotFoundException(
        `Admin user with ID ${adminUserId} not found`
      );
    }

    // Update the request status to rejected
    updateRequest.status = dto.status;
    updateRequest.adminNote = dto.adminNote;
    updateRequest.reviewedBy = adminUser;
    updateRequest.reviewedAt = new Date();

    await em.persistAndFlush(updateRequest);

    return this.stationUpdateRequestToResponse(updateRequest);
  }

  private stationUpdateRequestToResponse(
    request: IStationUpdateRequest
  ): StationUpdateRequestRes {
    return {
      id: request.id,
      stationId: request.station.id,
      requestedById: request.requestedBy.id,
      requestedBy: this.toUserRef(request.requestedBy)!,
      changes: request.changes,
      status: request.status,
      adminNote: request.adminNote ?? undefined,
      reviewedById: request.reviewedBy?.id,
      reviewedBy: request.reviewedBy
        ? this.toUserRef(request.reviewedBy)
        : undefined,
      reviewedAt: request.reviewedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  private toUserRef(ref: unknown): UserRefDto | undefined {
    if (ref == null || typeof ref !== "object") return undefined;
    const maybe = ref as { id?: unknown; name?: unknown };
    if (typeof maybe.id !== "number" || typeof maybe.name !== "string") {
      return undefined;
    }
    return { id: maybe.id, name: maybe.name };
  }
}
