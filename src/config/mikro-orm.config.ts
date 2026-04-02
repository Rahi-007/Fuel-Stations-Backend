import * as dotenv from "dotenv";
import { defineConfig } from "@mikro-orm/postgresql";
import { UserSchema } from "../auth/entity/user.entity";
import { StationSchema, StationLikeSchema, StationFollowSchema, CommentSchema } from "../stations/station.entity";
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
    StationLikeSchema,
    StationFollowSchema,
    CommentSchema,
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
    connection: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
  },
});
