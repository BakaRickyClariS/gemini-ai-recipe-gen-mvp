import { jest } from "@jest/globals";
import { generateRecipeImage } from "../../src/services/imageGenerationService.js";
import { uploadToCloudinary } from "../../src/services/mediaService.js";

// Mock config before anything else to prevent environment variable errors during module load
jest.mock("../../src/config/unifiedConfig.js", () => ({
  config: {
    gemini: { apiKey: "mock-key" },
    unsplash: { accessKey: "mock-key" },
    cloudinary: {
      cloudName: "mock-cloud",
      apiKey: "mock-key",
      apiSecret: "mock-secret",
      uploadPreset: "mock-preset",
    },
  },
}));

// Mock media service singleton
jest.mock("../../src/services/mediaService.js", () => ({
  uploadToCloudinary: jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve({ secure_url: "https://mock-cloudinary.com/image.jpg" }),
    ),
}));

// Mock Google AI library
jest.mock("@google/genai", () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest
          .fn()
          .mockRejectedValue(new Error("Mocked Gemini 429 Quota Exhausted")),
      },
    })),
  };
});

describe("Image Generation Service Fallbacks", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  /**
   * Test: Gemini Fails -> Fallback to Pollinations
   * Verifies that the service attempts to fetch the image as a buffer and host it on Cloudinary.
   */
  it("should fallback to Pollinations when Gemini fails and upload to Cloudinary", async () => {
    // Arrange: Mock successful binary fetch for Pollinations
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    });

    // Act
    const result = await generateRecipeImage("三杯雞", "台式");

    // Assert
    expect(result).toEqual({ url: "https://mock-cloudinary.com/image.jpg" });
    expect(global.fetch).toHaveBeenCalled();
    expect(uploadToCloudinary).toHaveBeenCalled();
  });

  /**
   * Test: All Dynamic APIs Fail -> Fallback to Static Category Map
   * Verifies that the system returns a stable, high-quality image even when all generation APIs are down.
   */
  it("should fallback to static Unsplash mapping when both generation and search APIs fail", async () => {
    // Arrange: Mock sequential failures for Pollinations and Unsplash Search
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Pollinations connection failed")) // Level 2
      .mockResolvedValueOnce({ ok: false }) // Level 3: Unsplash Search API
      .mockResolvedValueOnce({
        // Level 4: Static Map Fetch
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      });

    // Act
    const result = await generateRecipeImage("義大利麵", "義式");

    // Assert
    expect(result).toEqual({ url: "https://mock-cloudinary.com/image.jpg" });
    // Should have tried: Pollinations -> Unsplash API -> Static Map Fetch
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  /**
   * Test: Cloudinary Failure Handling
   * Verifies that if hosting fails, the service either continues fallbacks or exits gracefully.
   */
  it("should return null if all fallbacks or hosting fails", async () => {
    // Arrange: Make everything fail including Cloudinary
    (uploadToCloudinary as jest.Mock).mockRejectedValue(
      new Error("Cloudinary Error"),
    );
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error("Pollinations Error"),
    );

    // Act
    const result = await generateRecipeImage("壽司", "日式");

    // Assert
    expect(result).toBeNull();
  });
});
