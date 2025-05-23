const User = require('../models/user.model'); // Mongoose User model
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

// It's highly recommended to use an environment variable for the JWT secret in production.
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-and-secret-key-please-change-me-for-production';

exports.signup = async (req, res) => {
  console.log('Auth Controller (Mongoose): signup hit');
  const { first_name, last_name, email, password, role, location_id, employee_id_internal, supervisor_id } = req.body;

  // Validate required fields
  if (!first_name || !last_name || !email || !password || !role || !location_id) {
    return res.status(400).json({ message: 'Missing required fields: first_name, last_name, email, password, role, location_id.' });
  }

  try {
    // Check if user with the given email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 10); // 10 is the salt rounds

    // Create a new User document
    const newUser = new User({
      first_name,
      last_name,
      email,
      password_hash: hashedPassword,
      role,
      location_id, // Assuming this is a valid ObjectId string for Location
      employee_id_internal: employee_id_internal || null,
      supervisor_id: supervisor_id || null, // Assuming this is a valid ObjectId string for User
    });

    await newUser.save();

    // Return a success message and the user object (excluding password)
    // Mongoose documents have a .toObject() or .toJSON() method
    const userResponse = newUser.toObject();
    delete userResponse.password_hash; // Remove password hash from response

    res.status(201).json({ message: 'User registered successfully.', user: userResponse });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 11000) { // MongoDB duplicate key error
      return res.status(400).json({ message: 'Duplicate key error.', error: error.keyValue });
    }
    if (error.name === 'ValidationError') { // Mongoose validation error
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: 'Validation error.', errors: messages });
    }
    res.status(500).json({ message: 'Error registering user.', error: error.message });
  }
};

exports.login = async (req, res) => {
  console.log('Auth Controller (Mongoose): login hit');
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcryptjs.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
    }

    // Generate a JWT containing _id (as user_id), role, and location_id
    const tokenPayload = {
      user_id: user._id, // Mongoose uses _id
      role: user.role,
      location_id: user.location_id,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

    // Return the token and user information (excluding password)
    const userResponse = user.toObject();
    delete userResponse.password_hash;

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in.', error: error.message });
  }
};
