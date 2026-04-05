import * as dotenv from "dotenv";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger, ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";

// Load environment variables
dotenv.config();

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  try {
    logger.log("🔄 Creating NestJS application...");
    const app = await NestFactory.create(AppModule);

    // CORS configuration
    app.enableCors({
      origin: "http://localhost:3000",
      credentials: true,
    });

    // Cookie parser middleware
    app.use(cookieParser());

    // Global prefix
    app.setGlobalPrefix("api");

    // Global validation pipe with enhanced error messages

    // Swagger configuration
    const config = new DocumentBuilder()
      .setTitle("FuelMap.bd")
      .setDescription(
        "API documentation for FuelMap.bd - Find nearby fuel stations in Bangladesh"
      )
      .setVersion("1.0.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "Authorization",
          in: "header",
        },
        "JWT-auth"
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api-docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    const port = process.env.PORT || 8001;
    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
  } catch (error) {
    logger.error("❌ Failed to start application:", error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error("❌ Application failed to start:", error);
  process.exit(1);
});
