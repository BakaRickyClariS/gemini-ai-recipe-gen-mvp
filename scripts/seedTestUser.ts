import { authService } from "../src/services/authService.js";
import dotenv from "dotenv";
import path from "path";

// ensure dotenv loads the right file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function seed() {
  try {
    const result = await authService.register({
      email: "test@fufood.com",
      password: "testpassword",
      displayName: "Test User",
    });
    console.log("Test user created:", result.user.email);
  } catch (err: any) {
    if (err.message === "Email already in use") {
      console.log("Test user already exists.");
    } else {
      console.error("Error creating user:", err);
    }
  }
}

seed().then(() => process.exit(0));
