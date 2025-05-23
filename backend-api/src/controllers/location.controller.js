const Location = require('../models/location.model'); // Mongoose Location model

// @desc    Get all locations
// @route   GET /api/locations
// @access  Authenticated (or Public, depending on requirements)
exports.getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find({}).select('name address'); // Select only name and address
    if (!locations) {
      return res.status(404).json({ message: 'No locations found.' });
    }
    res.status(200).json({
      success: true,
      count: locations.length,
      locations: locations,
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ message: 'Error fetching locations.', error: error.message });
  }
};

// @desc    Get single location by ID (Optional - useful for future enhancements)
// @route   GET /api/locations/:id
// @access  Authenticated
exports.getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id).select('name address');
    if (!location) {
      return res.status(404).json({ message: 'Location not found.' });
    }
    res.status(200).json({ success: true, location });
  } catch (error) {
    console.error(`Error fetching location ${req.params.id}:`, error);
    if (error.name === 'CastError') {
        return res.status(400).json({ message: `Invalid location ID format: ${req.params.id}` });
    }
    res.status(500).json({ message: 'Error fetching location.', error: error.message });
  }
};

// @desc    Create a new location (Optional - Admin only)
// @route   POST /api/locations
// @access  Admin
exports.createLocation = async (req, res) => {
  const { name, address } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Location name is required.' });
  }
  try {
    const newLocation = new Location({ name, address });
    await newLocation.save();
    res.status(201).json({ success: true, message: 'Location created successfully.', location: newLocation });
  } catch (error) {
    console.error('Error creating location:', error);
    if (error.code === 11000) { // Duplicate key
        return res.status(400).json({ message: 'Location with this name already exists.'});
    }
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message);
        return res.status(400).json({ message: 'Validation error.', errors: messages });
    }
    res.status(500).json({ message: 'Error creating location.', error: error.message });
  }
};
