import "dotenv/config";
import { authService } from "../src/services/authService.js";
import { groupRepository } from "../src/repositories/groupRepository.js";
import { userRepository } from "../src/repositories/userRepository.js";
import path from "path";

const seedUsers = [
  {
    email: "test1@fufood.com",
    password: "testpassword",
    displayName: "Test User 1",
  },
  {
    email: "test2@fufood.com",
    password: "testpassword",
    displayName: "Test User 2",
  },
  {
    email: "test3@fufood.com",
    password: "testpassword",
    displayName: "Test User 3",
  },
  {
    email: "test4@fufood.com",
    password: "testpassword",
    displayName: "Test User 4",
  },
];

async function seed() {
  try {
    const createdUsers: any[] = [];

    console.log("--- Seeding Users ---");
    // 1. Create Users
    for (const userData of seedUsers) {
      try {
        const result = await authService.register({
          email: userData.email,
          password: userData.password,
          displayName: userData.displayName,
        });
        console.log(`Test user created: ${result.user.email}`);
        createdUsers.push(result.user);
      } catch (err: any) {
        if (err.message === "Email already in use") {
          console.log(
            `Test user ${userData.email} already exists. Fetching...`,
          );
          const existingUser = await userRepository.findByEmail(userData.email);
          if (existingUser) {
            createdUsers.push(existingUser);
          }
        } else {
          console.error(`Error creating user ${userData.email}:`, err);
        }
      }
    }

    if (createdUsers.length < 2) {
      console.log("Not enough users created to form groups.");
      return;
    }

    console.log("\n--- Seeding Groups & Adding Members ---");

    const user1 = createdUsers[0];
    const user2 = createdUsers[1];
    const user3 = createdUsers[2];
    const user4 = createdUsers[3];

    // Helper function to safely create group and add members
    const ensureGroupAndMembers = async (
      ownerId: string,
      groupName: string,
      memberIds: string[],
    ) => {
      const group = await groupRepository.create({ name: groupName, ownerId });
      console.log(`Group created: [${group.name}] (Owner: ${ownerId})`);

      for (const memberId of memberIds) {
        if (memberId !== ownerId) {
          await groupRepository.addMember(group.id, memberId);
          console.log(`  -> Added member ID: ${memberId}`);
        }
      }
    };

    // Group 1: 料理愛好者 (Owner: User 1, Members: User 2, User 3)
    await ensureGroupAndMembers(user1.id, "料理愛好者", [user2.id, user3.id]);

    // Group 2: 週末聚餐 (Owner: User 2, Members: User 1, User 4)
    await ensureGroupAndMembers(user2.id, "週末聚餐", [user1.id, user4.id]);

    // Group 3: 私密群組 (Owner: User 3, Members: User 4)
    await ensureGroupAndMembers(user3.id, "私密群組", [user4.id]);

    console.log("\n✅ Seed data generated successfully !");
    console.log("-----------------------------------------");
    console.log("Test Accounts Available:");
    seedUsers.forEach((u) => console.log(`- ${u.email} / ${u.password}`));
    console.log("-----------------------------------------");
  } catch (err: any) {
    console.error("Error seeding data:", err);
  }
}

seed().then(() => process.exit(0));
