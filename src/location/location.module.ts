import { Module } from "@nestjs/common";
import { DivisionController } from "./division/division.controller";
import { DivisionService } from "./division/division.service";
import { DistrictController } from "./district/district.controller";
import { DistrictService } from "./district/district.service";
import { SubDistrictController } from "./sub-district/sub-district.controller";
import { SubDistrictService } from "./sub-district/sub-district.service";

@Module({
  controllers: [
    DivisionController,
    DistrictController,
    SubDistrictController,
  ],
  providers: [DivisionService, DistrictService, SubDistrictService],
  exports: [DivisionService, DistrictService, SubDistrictService],
})
export class LocationModule {}
