import { Request, Response } from "express";
import { V1UserController } from "../../src/controllers/V1UserController.js";
import { profileService } from "../../src/services/profileService.js";

// Mock the profile service so we don't connect to the database
jest.mock("../../src/services/profileService.js", () => ({
  profileService: {
    updateProfile: jest.fn(),
  },
}));

describe("V1UserController", () => {
  let controller: V1UserController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    controller = new V1UserController();

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
    it("should successfully update tour state and return 200", async () => {
      // Arrange
      mockReq.body = { isCompleted: true, currentStep: "HOME_TOUR" };
      (profileService.updateProfile as jest.Mock).mockResolvedValue(true);

      // Act
      await controller.updateTour(mockReq as Request, mockRes as Response);

      // Assert
      expect(profileService.updateProfile).toHaveBeenCalledWith(
        "test-user-id",
        {
          tourCompleted: true,
          tourCurrentStep: "HOME_TOUR",
        },
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { message: "Tour state updated successfully" },
      });
    });

    it("should allow partial updates (only isCompleted)", async () => {
      // Arrange
      mockReq.body = { isCompleted: true };
      (profileService.updateProfile as jest.Mock).mockResolvedValue(true);

      // Act
      await controller.updateTour(mockReq as Request, mockRes as Response);

      // Assert
      expect(profileService.updateProfile).toHaveBeenCalledWith(
        "test-user-id",
        {
          tourCompleted: true,
        },
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should return validation error (422) when invalid payload is provided", async () => {
      // Arrange
      mockReq.body = { isCompleted: "not-a-boolean" };

      // Act
      await controller.updateTour(mockReq as Request, mockRes as Response);

      // Assert
      expect(profileService.updateProfile).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "VALIDATION_ERROR",
          }),
        }),
      );
    });
  });
});
