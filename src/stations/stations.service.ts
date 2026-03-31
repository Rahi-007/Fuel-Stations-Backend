import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { EntityManager, FilterQuery } from "@mikro-orm/core";
import axios, { AxiosError } from "axios";
import { StationSchema, type IStation } from "./station.entity";
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
import { UpdateStationDto } from "./station.dto";

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
}

/** After DB sync — includes internal primary key. */
export interface FuelStationResponse extends FuelStationFromOsm {
  id: number;
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
        row.division = division;
        row.district = district;
        row.subDistrict = subDistrict;
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
        division,
        district,
        subDistrict,
        village: s.village,
      });
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
  ) {
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

    // total count
    const totalRows = await this.em.count(StationSchema, cond);

    const rows = await this.em.find(StationSchema, cond, {
      limit,
      offset,
      orderBy: { id: "DESC" },
      populate: ["division", "district", "subDistrict"] as const,
    });

    return {
      data: rows.map((r) => this.stationRowToResponse(r)),
      totalRows,
      page: params.page,
      limit,
    };
  }

  async findOneWithChildren(id: number): Promise<IStation> {
    const row = await this.em.findOne(
      StationSchema,
      { id },
      { populate: ["division", "subDistrict", "district"] as const }
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
  }

  async update(id: number, dto: UpdateStationDto): Promise<IStation> {
    const row = await this.em.findOne(
      StationSchema,
      { id },
      {
        populate: ["division", "district", "subDistrict"] as const,
      }
    );

    if (!row) {
      throw new NotFoundException(`Station with ID ${id} not found`);
    }

    if (dto.divisionId !== undefined) {
      if (dto.divisionId === null) {
        row.division = null;
      } else if (dto.divisionId !== row.division?.id) {
        row.division = await this.resolveDivisionForUpdate(dto.divisionId);
      }
    }

    if (dto.districtId !== undefined) {
      if (dto.districtId === null) {
        row.district = null;
      } else if (dto.districtId !== row.district?.id) {
        row.district = await this.resolveDistrictForUpdate(dto.districtId);
      }
    }

    if (dto.subDistrictId !== undefined) {
      if (dto.subDistrictId === null) {
        row.subDistrict = null;
      } else if (dto.subDistrictId !== row.subDistrict?.id) {
        row.subDistrict = await this.resolveSubDistrictForUpdate(
          dto.subDistrictId
        );
      }
    }

    this.validateRelationConsistency(row);
    this.applyBasicFields(row, dto);

    row.updatedAt = new Date();

    await this.em.flush();

    return row;
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
    };
  }
}
