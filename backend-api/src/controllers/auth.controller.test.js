// backend-api/src/controllers/auth.controller.test.js
const authController = require('./auth.controller');
const User = require('../models/user.model');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const httpMocks = require('node-mocks-http'); // Helper for mocking req/res

// Mock dependencies
jest.mock('../models/user.model');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn(); // Mock for Express next function, if ever used
    jest.clearAllMocks(); // Clear mocks before each test
  });

  describe('signup', () => {
    it('should successfully sign up a new user and return 201', async () => {
      req.body = {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        password: 'password123',
        role: 'employee',
        location_id: '60d0fe4f5311236168a109cb', // Mock ObjectId string
      };

      User.findOne.mockResolvedValue(null); // User does not exist
      bcryptjs.hash.mockResolvedValue('hashedPassword123');
      
      // Mock the save method on the User instance
      const mockUserInstance = {
        ...req.body, // Spread the body to simulate document creation
        _id: 'mockUserId',
        password_hash: 'hashedPassword123',
        toObject: jest.fn().mockReturnValue({ // Mock toObject for response
          _id: 'mockUserId',
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          role: 'employee',
          location_id: '60d0fe4f5311236168a109cb',
        }),
      };
      // User constructor mock to return our instance which has a save method
      User.mockImplementation(() => ({
         save: jest.fn().mockResolvedValue(mockUserInstance)
      }));
      // Or, if User.create is used internally by your controller (which it isn't directly, new User().save() is)
      // User.create.mockResolvedValue(mockUserInstance);


      await authController.signup(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcryptjs.hash).toHaveBeenCalledWith('password123', 10);
      // expect(User.prototype.save).toHaveBeenCalled(); // This is tricky to assert due to how it's called on an instance
      expect(res.statusCode).toBe(201);
      const responseData = res._getJSONData();
      expect(responseData.message).toBe('User registered successfully.');
      expect(responseData.user).toBeDefined();
      expect(responseData.user.email).toBe('test@example.com');
      expect(responseData.user.password_hash).toBeUndefined(); // Ensure password_hash is removed
    });

    it('should return 400 if user with the email already exists', async () => {
      req.body = {
        first_name: 'Test',
        last_name: 'User',
        email: 'existing@example.com',
        password: 'password123',
        role: 'employee',
        location_id: '60d0fe4f5311236168a109cb',
      };
      User.findOne.mockResolvedValue({ email: 'existing@example.com' }); // User exists

      await authController.signup(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'existing@example.com' });
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().message).toBe('User with this email already exists.');
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = { email: 'test@example.com', password: 'password123' }; // Missing first_name, last_name, role, location_id

      await authController.signup(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().message).toContain('Missing required fields');
    });
     
    it('should handle Mongoose validation errors during signup', async () => {
        req.body = { /* valid required fields */
            first_name: 'Test', last_name: 'User', email: 'invalid-email', // an invalid email to trigger validation
            password: 'password123', role: 'employee', location_id: 'loc123'
        };
        User.findOne.mockResolvedValue(null); // User does not exist
        bcryptjs.hash.mockResolvedValue('hashedPassword123');
        const validationError = new Error("Validation failed");
        validationError.name = "ValidationError";
        validationError.errors = { email: { message: "Invalid email format" } };
        
        User.mockImplementation(() => ({
            save: jest.fn().mockRejectedValue(validationError)
        }));

        await authController.signup(req, res);

        expect(res.statusCode).toBe(400);
        expect(res._getJSONData().message).toBe('Validation error.');
        expect(res._getJSONData().errors).toContain('Invalid email format');
    });


    it('should handle MongoDB duplicate key errors (e.g. email) during signup', async () => {
        req.body = { /* valid fields */
            first_name: 'Test', last_name: 'User', email: 'duplicate@example.com',
            password: 'password123', role: 'employee', location_id: 'loc123'
        };
        User.findOne.mockResolvedValue(null);
        bcryptjs.hash.mockResolvedValue('hashedPassword');
        const duplicateKeyError = new Error("Duplicate key");
        duplicateKeyError.code = 11000;
        duplicateKeyError.keyValue = { email: 'duplicate@example.com' };
        User.mockImplementation(() => ({
            save: jest.fn().mockRejectedValue(duplicateKeyError)
        }));

        await authController.signup(req, res);

        expect(res.statusCode).toBe(400);
        expect(res._getJSONData().message).toBe('Duplicate key error.');
    });

  });

  describe('login', () => {
    it('should successfully log in a user and return 200 with token', async () => {
      req.body = { email: 'test@example.com', password: 'password123' };
      const mockUser = {
        _id: 'userId123',
        email: 'test@example.com',
        password_hash: 'hashedPassword123',
        role: 'employee',
        location_id: 'locationId123',
        toObject: jest.fn().mockReturnValue({ // Mock toObject for response
          _id: 'userId123',
          email: 'test@example.com',
          role: 'employee',
          location_id: 'locationId123',
        }),
      };
      User.findOne.mockResolvedValue(mockUser);
      bcryptjs.compare.mockResolvedValue(true); // Password matches
      jwt.sign.mockReturnValue('mockAuthToken');

      await authController.login(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcryptjs.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(jwt.sign).toHaveBeenCalledWith(
        { user_id: 'userId123', role: 'employee', location_id: 'locationId123' },
        expect.any(String), // JWT_SECRET
        { expiresIn: '1h' }
      );
      expect(res.statusCode).toBe(200);
      const responseData = res._getJSONData();
      expect(responseData.message).toBe('Login successful.');
      expect(responseData.token).toBe('mockAuthToken');
      expect(responseData.user.email).toBe('test@example.com');
      expect(responseData.user.password_hash).toBeUndefined();
    });

    it('should return 401 if user email is not found', async () => {
      req.body = { email: 'nonexistent@example.com', password: 'password123' };
      User.findOne.mockResolvedValue(null); // User not found

      await authController.login(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toBe('Invalid credentials. User not found.');
    });

    it('should return 401 if password does not match', async () => {
      req.body = { email: 'test@example.com', password: 'wrongpassword' };
      const mockUser = {
        _id: 'userId123',
        email: 'test@example.com',
        password_hash: 'hashedPassword123',
        role: 'employee',
        location_id: 'locationId123',
      };
      User.findOne.mockResolvedValue(mockUser);
      bcryptjs.compare.mockResolvedValue(false); // Password does not match

      await authController.login(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcryptjs.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword123');
      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toBe('Invalid credentials. Password incorrect.');
    });
    
    it('should return 400 if email or password is not provided', async () => {
      req.body = { email: 'test@example.com' }; // Password missing
      await authController.login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().message).toBe('Email and password are required.');

      req.body = { password: 'password123' }; // Email missing
      // Need to re-create res for the second call or use a spy to check calls
      res = httpMocks.createResponse();
      await authController.login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().message).toBe('Email and password are required.');
    });
  });
});
