import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "../jwt.strategy";
import { CustomJwtService } from "./jwt.service";
import { jwtConfig } from "./jwt.config";

@Module({
  imports: [JwtModule.register(jwtConfig)],
  providers: [JwtStrategy, CustomJwtService],
  exports: [JwtModule, JwtStrategy, CustomJwtService],
})
export class CustomJwtModule {}
