import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  tablesFilter: [
    "users",
    "groups",
    "group_memberships",
    "group_invitations",
    "shopping_lists",
    "shopping_list_items",
    "subscriptions",
  ],
});
