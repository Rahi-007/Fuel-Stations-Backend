import { JwtModuleOptions } from "@nestjs/jwt";
import { StringValue } from "ms";

export const jwtConfig: JwtModuleOptions = {
  secret: process.env.JWT_SECRET || "default_secret_key",
  signOptions: {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "1d") as StringValue,
  },
};

export const jwtRefreshConfig: JwtModuleOptions = {
  secret: process.env.JWT_REFRESH_SECRET || "default_refresh_secret_key",
  signOptions: {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as StringValue,
  },
};
