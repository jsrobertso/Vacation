// backend-api/src/controllers/vacation.controller.test.js
const vacationController = require('./vacation.controller');
const User = require('../models/user.model');
const Location = require('../models/location.model');
const VacationRequest = require('../models/vacationRequest.model');
const mongoose = require('mongoose');
const httpMocks = require('node-mocks-http');

// Mock dependencies
jest.mock('../models/user.model');
jest.mock('../models/location.model');
jest.mock('../models/vacationRequest.model');
// No need to mock mongoose itself unless specific mongoose utility functions are used directly and need mocking

describe('Vacation Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  // --- submitRequest Tests ---
  describe('submitRequest', () => {
    it('should successfully submit a vacation request and return 201', async () => {
      req.user = { _id: new mongoose.Types.ObjectId().toString() }; // Mock authenticated user
      req.body = {
        start_date: '2024-10-01',
        end_date: '2024-10-05',
        reason: 'Annual leave',
      };

      const mockSavedRequest = {
        _id: new mongoose.Types.ObjectId().toString(),
        ...req.body,
        user_id: req.user._id,
        status: 'pending',
        requested_date: new Date().toISOString(),
      };
      
      // Mock the save method on the VacationRequest instance
      VacationRequest.prototype.save = jest.fn().mockResolvedValue(mockSavedRequest);
      // Mock findById for populating the response (if your controller does this)
      VacationRequest.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSavedRequest) // Chain populate
      });


      await vacationController.submitRequest(req, res);

      expect(VacationRequest.prototype.save).toHaveBeenCalled();
      expect(res.statusCode).toBe(201);
      expect(res._getJSONData().message).toBe('Vacation request submitted successfully.');
      expect(res._getJSONData().request.reason).toBe('Annual leave');
    });

    it('should return 400 if start_date is after end_date', async () => {
      req.user = { _id: new mongoose.Types.ObjectId().toString() };
      req.body = {
        start_date: '2024-10-05',
        end_date: '2024-10-01',
        reason: 'Time travel',
      };

      await vacationController.submitRequest(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().message).toBe('End date must be after start date.');
    });
    
    it('should return 401 if user is not authenticated', async () => {
      req.body = { start_date: '2024-10-01', end_date: '2024-10-05', reason: 'Test' };
      // req.user is not set
      await vacationController.submitRequest(req, res);
      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toBe('Unauthorized: User not identified.');
    });

    it('should handle Mongoose validation errors during submitRequest', async () => {
        req.user = { _id: new mongoose.Types.ObjectId().toString() };
        req.body = { start_date: 'invalid-date', end_date: '2024-10-05', reason: 'Test' };
        // This specific test might be hard to trigger if date validation is loose in controller
        // but model validation should catch it. We're mocking save directly.
        const validationError = new Error("Validation failed");
        validationError.name = "ValidationError";
        validationError.errors = { start_date: { message: "Invalid start date" } };
        VacationRequest.prototype.save = jest.fn().mockRejectedValue(validationError);

        await vacationController.submitRequest(req, res);
        expect(res.statusCode).toBe(400);
        expect(res._getJSONData().message).toBe('Validation error.');
    });
  });

  // --- getEmployeeRequests Tests ---
  describe('getEmployeeRequests', () => {
    it('should return 200 and employee requests', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      req.user = { _id: userId };
      const mockRequests = [{ _id: 'req1', reason: 'Vacation' }];
      
      VacationRequest.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({ // First populate (user_id)
            populate: jest.fn().mockReturnValue({ // Second populate (approved_by_id)
                sort: jest.fn().mockResolvedValue(mockRequests) // Then sort
            })
        })
      });

      await vacationController.getEmployeeRequests(req, res);

      expect(VacationRequest.find).toHaveBeenCalledWith({ user_id: userId });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().requests).toEqual(mockRequests);
    });
  });

  // --- getSupervisorRequests Tests ---
  describe('getSupervisorRequests', () => {
    it('should return 200 and requests for subordinates if user is supervisor', async () => {
      const supervisorId = new mongoose.Types.ObjectId().toString();
      req.user = { _id: supervisorId, role: 'supervisor' };
      const subordinates = [{ _id: 'emp1' }, { _id: 'emp2' }];
      User.find.mockResolvedValue(subordinates); // Mock finding subordinates
      const mockPendingRequests = [{ _id: 'reqSub1', status: 'pending' }];
      VacationRequest.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({ // Mock populate chain
            sort: jest.fn().mockResolvedValue(mockPendingRequests)
        })
      });

      await vacationController.getSupervisorRequests(req, res);

      expect(User.find).toHaveBeenCalledWith({ supervisor_id: supervisorId });
      expect(VacationRequest.find).toHaveBeenCalledWith({
        status: 'pending',
        user_id: { $in: ['emp1', 'emp2'] },
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().requests).toEqual(mockPendingRequests);
    });

    it('should return 200 and all pending requests if user is admin', async () => {
      req.user = { _id: new mongoose.Types.ObjectId().toString(), role: 'admin' };
      const mockAllPendingRequests = [{ _id: 'reqAdmin1', status: 'pending' }];
      VacationRequest.find = jest.fn().mockReturnValue({
         populate: jest.fn().mockReturnValue({ // Mock populate chain
            sort: jest.fn().mockResolvedValue(mockAllPendingRequests)
        })
      });

      await vacationController.getSupervisorRequests(req, res);

      expect(VacationRequest.find).toHaveBeenCalledWith({ status: 'pending' });
      expect(User.find).not.toHaveBeenCalled(); // Admin doesn't need to find subordinates for this logic
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().requests).toEqual(mockAllPendingRequests);
    });

    it('should return 403 if user is not supervisor or admin', async () => {
        req.user = { _id: new mongoose.Types.ObjectId().toString(), role: 'employee' };
        await vacationController.getSupervisorRequests(req, res);
        expect(res.statusCode).toBe(403);
    });
  });

  // --- approveRequest Tests ---
  describe('approveRequest', () => {
    const requestId = new mongoose.Types.ObjectId().toString();
    const employeeUserId = new mongoose.Types.ObjectId().toString();
    const supervisorUserId = new mongoose.Types.ObjectId().toString();

    it('should successfully approve a request by authorized supervisor and return 200', async () => {
      req.params = { id: requestId };
      req.user = { _id: supervisorUserId, role: 'supervisor' };
      req.body = { supervisor_comments: 'Approved' };

      const mockRequest = {
        _id: requestId,
        user_id: employeeUserId, // This is an ObjectId or string in the actual document
        status: 'pending',
        // save: jest.fn().mockResolvedValue({ ... }), // Not used with findByIdAndUpdate
      };
      const updatedRequest = { ...mockRequest, status: 'approved', supervisor_comments: 'Approved' };

      VacationRequest.findById.mockResolvedValue(mockRequest);
      // Mock the isSupervisorOf helper function (indirectly by mocking User.findById)
      User.findById.mockResolvedValue({ _id: employeeUserId, supervisor_id: supervisorUserId });
      VacationRequest.findByIdAndUpdate.mockReturnValue({ // findByIdAndUpdate returns a Query
        populate: jest.fn().mockReturnValue({ // First populate
            populate: jest.fn().mockResolvedValue(updatedRequest) // Second populate
        })
      });


      await vacationController.approveRequest(req, res);

      expect(VacationRequest.findById).toHaveBeenCalledWith(requestId);
      expect(User.findById).toHaveBeenCalledWith(employeeUserId); // Check for supervisor authorization
      expect(VacationRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({ status: 'approved', approved_by_id: supervisorUserId }),
        { new: true }
      );
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().request.status).toBe('approved');
    });

    it('should successfully approve a request by admin and return 200', async () => {
      req.params = { id: requestId };
      req.user = { _id: new mongoose.Types.ObjectId().toString(), role: 'admin' }; // Admin user
      req.body = { supervisor_comments: 'Admin approved' };
      
      const mockRequest = { _id: requestId, user_id: employeeUserId, status: 'pending' };
      const updatedRequest = { ...mockRequest, status: 'approved' };
      VacationRequest.findById.mockResolvedValue(mockRequest);
      VacationRequest.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(updatedRequest)
        })
      });

      await vacationController.approveRequest(req, res);

      expect(User.findById).not.toHaveBeenCalled(); // Admin doesn't need supervisor check
      expect(VacationRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({ status: 'approved' }),
        { new: true }
      );
      expect(res.statusCode).toBe(200);
    });

    it('should return 403 if user is not authorized to approve', async () => {
      req.params = { id: requestId };
      req.user = { _id: new mongoose.Types.ObjectId().toString(), role: 'employee' }; // Employee user
      
      await vacationController.approveRequest(req, res);
      expect(res.statusCode).toBe(403);
    });
    
    it('should return 403 if supervisor is not the direct supervisor of the employee', async () => {
        req.params = { id: requestId };
        req.user = { _id: supervisorUserId, role: 'supervisor' };
        const anotherSupervisorId = new mongoose.Types.ObjectId().toString();
        const mockRequest = { _id: requestId, user_id: employeeUserId, status: 'pending' };
        VacationRequest.findById.mockResolvedValue(mockRequest);
        User.findById.mockResolvedValue({ _id: employeeUserId, supervisor_id: anotherSupervisorId }); // Employee reports to someone else

        await vacationController.approveRequest(req, res);
        expect(res.statusCode).toBe(403);
        expect(res._getJSONData().message).toBe('Forbidden: You are not the direct supervisor for this employee.');
    });
  });

  // --- rejectRequest Tests ---
  describe('rejectRequest', () => {
    const requestId = new mongoose.Types.ObjectId().toString();
    const employeeUserId = new mongoose.Types.ObjectId().toString();
    const supervisorUserId = new mongoose.Types.ObjectId().toString();

    it('should successfully reject a request by authorized supervisor and return 200', async () => {
      req.params = { id: requestId };
      req.user = { _id: supervisorUserId, role: 'supervisor' };
      req.body = { supervisor_comments: 'Rejected due to project deadlines' };

      const mockRequest = { _id: requestId, user_id: employeeUserId, status: 'pending' };
      const updatedRequest = { ...mockRequest, status: 'rejected', supervisor_comments: req.body.supervisor_comments };
      VacationRequest.findById.mockResolvedValue(mockRequest);
      User.findById.mockResolvedValue({ _id: employeeUserId, supervisor_id: supervisorUserId });
      VacationRequest.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(updatedRequest)
        })
      });

      await vacationController.rejectRequest(req, res);

      expect(VacationRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({ status: 'rejected', supervisor_comments: req.body.supervisor_comments }),
        { new: true }
      );
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().request.status).toBe('rejected');
    });

    it('should return 400 if supervisor_comments are missing for rejection', async () => {
      req.params = { id: requestId };
      req.user = { _id: supervisorUserId, role: 'supervisor' };
      req.body = { supervisor_comments: '' }; // Missing comments

      await vacationController.rejectRequest(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().message).toBe('Supervisor comments are required when rejecting a request.');
    });
  });
});
