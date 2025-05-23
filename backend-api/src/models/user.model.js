const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  employee_id_internal: {
    type: String,
    trim: true,
  },
  first_name: {
    type: String,
    required: [true, 'First name is required.'],
    trim: true,
  },
  last_name: {
    type: String,
    required: [true, 'Last name is required.'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required.'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address.'],
  },
  password_hash: {
    type: String,
    required: [true, 'Password hash is required.'],
  },
  role: {
    type: String,
    enum: ['employee', 'supervisor', 'admin'],
    required: [true, 'Role is required.'],
  },
  location_id: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
    required: [true, 'Location ID is required.'],
  },
  supervisor_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, { timestamps: true });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.first_name} ${this.last_name}`;
});

// Indexing for frequently queried fields
UserSchema.index({ email: 1 });
UserSchema.index({ location_id: 1 });
UserSchema.index({ supervisor_id: 1 });

module.exports = mongoose.model('User', UserSchema);
