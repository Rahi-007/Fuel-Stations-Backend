import mikroOrmConfig from "./mikro-orm.config";
import { UserSchema } from "../auth/entity/user.entity";
import { Role } from "../utils/enums";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { MikroORM } from "@mikro-orm/postgresql";

// Load environment variables
dotenv.config();

// Simple seeding script for development
export async function runSeeding(refresh = true) {
  console.log(`🌱 ${refresh ? "Refreshing" : "Syncing"} database...`);

  // Validate environment variables
  if (!process.env.DATABASE_URL) {
    throw new Error("❌ DATABASE_URL environment variable is required");
  }

  let orm: MikroORM | undefined;

  try {
    // Connect to database silently
    orm = await MikroORM.init({
      ...mikroOrmConfig,
      debug: false, // Disable query logging
      logger: () => {}, // Disable all logging
    });
    console.log("✅ Database connection established");

    const em = orm.em.fork();

    if (refresh) {
      // For Neon, use schema refresh instead of drop/create
      console.log("🔄 Resetting schema...");
      await orm.schema.refreshDatabase();
      console.log("✅ Database schema created");
    } else {
      // Update schema (sync mode) - preserves existing data
      await orm.schema.updateSchema();
      console.log("✅ Database schema synced");
    }

    // Refresh the EntityManager metadata after schema changes
    em.clear();

    // Seed Admin User (only if not exists)
    console.log("👤 Seeding users...");
    let adminUser = await em.findOne(UserSchema, {
      email: "admin@example.com",
    });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash("admin123", 12);

      adminUser = em.create(UserSchema, {
        firstName: "Admin",
        lastName: "User",
        phone: "+1234567890",
        email: "admin@example.com",
        passHash: hashedPassword,
        role: Role.ADMIN,
        isVerified: false,
        isBlocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await em.persist(adminUser).flush();
      console.log("✅ Admin user created");
    } else {
      console.log("ℹ️ Admin user already exists");
    }

    // Seed Regular User (only if not exists)
    let regularUser = await em.findOne(UserSchema, {
      email: "user@example.com",
    });
    if (!regularUser) {
      const hashedPassword = await bcrypt.hash("user123", 12);

      regularUser = em.create(UserSchema, {
        firstName: "Regular",
        lastName: "User",
        phone: "+1234567891",
        email: "user@example.com",
        passHash: hashedPassword,
        role: Role.USER,
        isVerified: false,
        isBlocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await em.persist(regularUser).flush();
      console.log("✅ Regular user created");
    } else {
      console.log("ℹ️ Regular user already exists");
    }

    console.log("✅ Seeding completed successfully");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    if (orm) {
      await orm.close();
      console.log("🔒 Database connection closed");
    }
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  const refresh = process.argv.includes("--refresh");
  runSeeding(refresh).catch(console.error);
}
