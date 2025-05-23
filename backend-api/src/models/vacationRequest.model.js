const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VacationRequestSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required.'],
  },
  start_date: {
    type: Date,
    required: [true, 'Start date is required.'],
  },
  end_date: {
    type: Date,
    required: [true, 'End date is required.'],
    validate: [
      function(value) {
        // 'this' refers to the document being validated
        return this.start_date < value;
      },
      'End date must be after start date.'
    ]
  },
  reason: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    required: true,
    default: 'pending',
  },
  requested_date: {
    type: Date,
    default: Date.now,
  },
  approved_by_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  actioned_date: {
    type: Date,
    default: null,
  },
  supervisor_comments: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

// Indexing for frequently queried fields
VacationRequestSchema.index({ user_id: 1 });
VacationRequestSchema.index({ status: 1 });
VacationRequestSchema.index({ approved_by_id: 1 });
VacationRequestSchema.index({ start_date: 1, end_date: 1 });


// Ensure end_date is after start_date using a pre-save hook as well, for robustness
// Mongoose schema-level validation (like above) is generally preferred for this.
// This is more of an example if complex logic was needed.
VacationRequestSchema.pre('save', function(next) {
  if (this.start_date && this.end_date && this.start_date >= this.end_date) {
    next(new Error('End date must be after start date.'));
  } else {
    next();
  }
});

module.exports = mongoose.model('VacationRequest', VacationRequestSchema);
