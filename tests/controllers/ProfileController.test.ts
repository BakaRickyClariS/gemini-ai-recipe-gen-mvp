import { Request, Response } from "express";
import { ProfileController } from "../../src/controllers/ProfileController.js";
import { profileService } from "../../src/services/profileService.js";

// Mock the profile service
jest.mock("../../src/services/profileService.js", () => ({
  profileService: {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

describe("ProfileController (v2)", () => {
  let controller: ProfileController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    controller = new ProfileController();

    mockReq = {
      user: { userId: "test-user-id" },
    } as unknown as Partial<Request>;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("updateTour", () => {
    it("should successfully update tour state and return 200 with full profile", async () => {
      // Arrange
      mockReq.body = { isCompleted: true, currentStep: "HOME_TOUR" };
      const mockUpdatedUser = {
        id: "test-user-id",
        displayName: "Test User",
        tourCompleted: true,
        tourCurrentStep: "HOME_TOUR",
        tourUpdatedAt: new Date(),
      };
      (profileService.updateProfile as jest.Mock).mockResolvedValue(
        mockUpdatedUser,
      );

      // Act
      await controller.updateTour(mockReq as Request, mockRes as Response);

      // Assert
      expect(profileService.updateProfile).toHaveBeenCalledWith(
        "test-user-id",
        expect.objectContaining({
          tourCompleted: true,
          tourCurrentStep: "HOME_TOUR",
          tourUpdatedAt: expect.any(Date),
        }),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: "Test User",
          tourCompleted: true,
          tourCurrentStep: "HOME_TOUR",
        }),
      });
    });

    it("should return validation error (422) when invalid payload is provided", async () => {
      // Arrange
      mockReq.body = { isCompleted: "not-a-boolean" };

      // Act
      await controller.updateTour(mockReq as Request, mockRes as Response);

      // Assert
      expect(profileService.updateProfile).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(422);
    });
  });
});
