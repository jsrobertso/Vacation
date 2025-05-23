const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { protect, authorize } = require('../middleware/auth.middleware'); // Assuming auth middleware exists

// @route   GET /api/locations
// @desc    Get all locations
// @access  Authenticated users (e.g., for signup form, general browsing)
//          Adjust protection as needed. If locations are public, 'protect' can be removed.
router.get('/', protect, locationController.getAllLocations);

// @route   GET /api/locations/:id
// @desc    Get a single location by its ID
// @access  Authenticated users
router.get('/:id', protect, locationController.getLocationById);

// @route   POST /api/locations
// @desc    Create a new location
// @access  Admin only
router.post('/', protect, authorize('admin'), locationController.createLocation);

module.exports = router;
