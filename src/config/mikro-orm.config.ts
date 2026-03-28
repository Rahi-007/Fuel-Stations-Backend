import * as dotenv from "dotenv";
import { defineConfig } from "@mikro-orm/postgresql";
import { UserSchema } from "../auth/entity/user.entity";
import { StationSchema } from "../stations/station.entity";
import { DivisionSchema } from "../location/entity/division.entity";
import { DistrictSchema } from "../location/entity/district.entity";
import { SubDistrictSchema } from "../location/entity/subDistrict.entity";

dotenv.config();

export default defineConfig({
  clientUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:root@localhost:5432/fuel",
  entities: [
    UserSchema,
    DivisionSchema,
    DistrictSchema,
    SubDistrictSchema,
    StationSchema,
  ],
  debug: false,
  allowGlobalContext: true,
  pool: {
    min: 2,
    max: 10,
  },
  seeder: {
    path: "./src/config",
    defaultSeeder: "Seed",
  },
  driverOptions: {
    // Only add SSL if using production / cloud DB
    ssl:
      process.env.NODE_ENV === "production" ||
      process.env.DATABASE_URL?.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : false,
  },
});
