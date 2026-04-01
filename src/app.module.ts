import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MikroOrmModule, type MikroOrmModuleSyncOptions } from "@mikro-orm/nestjs";
import mikroOrmConfig from "./config/mikro-orm.config";
import { CustomJwtModule } from "./config/jwt/jwt.module";
import { AuthModule } from "./auth/auth.module";
import { StationsModule } from "./stations/stations.module";
import { LocationModule } from "./location/location.module";

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig as MikroOrmModuleSyncOptions),
    CustomJwtModule,
    AuthModule,
    StationsModule,
    LocationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
