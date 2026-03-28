import { defineEntity, type InferEntity, p } from "@mikro-orm/core";
import { BaseSchema } from "../auth/entity/base.entity";
import { DivisionSchema } from "../location/entity/division.entity";
import { DistrictSchema } from "../location/entity/district.entity";
import { SubDistrictSchema } from "../location/entity/subDistrict.entity";

/** Stable OSM identity: "node/123", "way/456" — unique across the planet. */
export const StationSchema = defineEntity({
  name: "Station",
  extends: BaseSchema,
  properties: {
    osmRef: p.string().unique().length(48),
    name: p.string().nullable().length(255),
    brand: p.string().nullable().length(191),
    lat: p.double(),
    lng: p.double(),
    division: () => p.manyToOne(DivisionSchema).nullable(),
    district: () => p.manyToOne(DistrictSchema).nullable(),
    subDistrict: () => p.manyToOne(SubDistrictSchema).nullable(),
    village: p.string().nullable().length(191).index(),
    tags: p.json().nullable(),
  },
});

export type IStation = InferEntity<typeof StationSchema>;
