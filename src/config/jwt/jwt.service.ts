import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class CustomJwtService {
  constructor(private readonly jwtService: JwtService) {}
  async generateToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.sign(payload);
  }

  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      return null;
    }
  }
}
