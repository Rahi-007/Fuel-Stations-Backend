import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import mikroOrmConfig from "./config/mikro-orm.config";
import { CustomJwtModule } from "./config/jwt/jwt.module";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    CustomJwtModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
