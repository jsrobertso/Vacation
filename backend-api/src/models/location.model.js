const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LocationSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Location name is required.'],
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

// Indexing for frequently queried fields
LocationSchema.index({ name: 1 });

module.exports = mongoose.model('Location', LocationSchema);
