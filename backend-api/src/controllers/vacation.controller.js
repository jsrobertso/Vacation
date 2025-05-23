const User = require('../models/user.model');
const Location = require('../models/location.model'); // Though not explicitly used in logic, good to have if needed
const VacationRequest = require('../models/vacationRequest.model');
const mongoose = require('mongoose'); // Required for ObjectId validation

// Helper function to check if a user is a supervisor of another
const isSupervisorOf = async (supervisorId, employeeId) => {
  if (!supervisorId || !employeeId) return false;
  if (!mongoose.Types.ObjectId.isValid(employeeId) || !mongoose.Types.ObjectId.isValid(supervisorId)) return false;
  const employee = await User.findById(employeeId);
  // Mongoose returns null if not found. ObjectId comparison needs .equals() or cast to string
  return employee && employee.supervisor_id && employee.supervisor_id.equals(supervisorId);
};

exports.submitRequest = async (req, res) => {
  console.log('Vacation Controller (Mongoose): submitRequest hit');
  const { start_date, end_date, reason } = req.body;
  // req.user._id is expected from auth middleware (using Mongoose _id)
  const user_id = req.user?._id;

  if (!user_id) {
    return res.status(401).json({ message: 'Unauthorized: User not identified.' });
  }
  if (!mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ message: 'Invalid user ID format.' });
  }

  if (!start_date || !end_date) {
    return res.status(400).json({ message: 'start_date and end_date are required.' });
  }

  // Model-level validation should handle end_date > start_date
  // new Date() conversion is important if dates come as strings
  if (new Date(start_date) >= new Date(end_date)) {
     return res.status(400).json({ message: 'End date must be after start date.' });
  }

  try {
    const newRequest = new VacationRequest({
      user_id, // This will be a Mongoose ObjectId
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      reason: reason || null,
      // status and requested_date have defaults in schema
    });
    await newRequest.save();
    // Populate user details for the response, including location
    const populatedRequest = await VacationRequest.findById(newRequest._id)
        .populate({
            path: 'user_id',
            select: 'first_name last_name email location_id',
            populate: { path: 'location_id', select: 'name' }
        });
    res.status(201).json({ message: 'Vacation request submitted successfully.', request: populatedRequest });
  } catch (error) {
    console.error('Error submitting vacation request:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: 'Validation error.', errors: messages });
    }
    res.status(500).json({ message: 'Error submitting vacation request.', error: error.message });
  }
};

exports.getEmployeeRequests = async (req, res) => {
  console.log('Vacation Controller (Mongoose): getEmployeeRequests hit');
  const user_id = req.user?._id;

  if (!user_id) {
    return res.status(401).json({ message: 'Unauthorized: User not identified.' });
  }
  if (!mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ message: 'Invalid user ID format.' });
  }

  try {
    const requests = await VacationRequest.find({ user_id })
      .populate({
          path: 'user_id',
          select: 'first_name last_name email location_id',
          populate: { path: 'location_id', select: 'name' }
      })
      .populate({
          path: 'approved_by_id',
          select: 'first_name last_name email location_id', // Also populate location for approver if needed
          populate: { path: 'location_id', select: 'name' }
      })
      .sort({ requested_date: -1 }); // Sort by most recent first
    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error fetching employee requests:', error);
    res.status(500).json({ message: 'Error fetching employee requests.', error: error.message });
  }
};

exports.getSupervisorRequests = async (req, res) => {
  console.log('Vacation Controller (Mongoose): getSupervisorRequests hit');
  const supervisor_user_id = req.user?._id; // This is the ID of the logged-in supervisor
  const supervisor_role = req.user?.role;

  if (!supervisor_user_id || (supervisor_role !== 'supervisor' && supervisor_role !== 'admin')) {
    return res.status(403).json({ message: 'Forbidden: User is not a supervisor or admin.' });
  }
  if (!mongoose.Types.ObjectId.isValid(supervisor_user_id)) {
    return res.status(400).json({ message: 'Invalid supervisor ID format.' });
  }

  try {
    let query = { status: 'pending' };

    if (supervisor_role === 'supervisor') {
      // Find all users who report to this supervisor
      const subordinates = await User.find({ supervisor_id: supervisor_user_id }).select('_id');
      if (!subordinates.length) {
        return res.status(200).json({ requests: [] }); // No subordinates, so no requests to show
      }
      const subordinateIds = subordinates.map(s => s._id);
      query.user_id = { $in: subordinateIds };
    }
    // For 'admin', the query remains just { status: 'pending' } to get all pending requests

    const requests = await VacationRequest.find(query)
      .populate({
          path: 'user_id',
          select: 'first_name last_name email employee_id_internal location_id',
          populate: { path: 'location_id', select: 'name' }
      })
      .sort({ requested_date: 1 }); // Sort by oldest first to prioritize
    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error fetching supervisor requests:', error);
    res.status(500).json({ message: 'Error fetching supervisor requests.', error: error.message });
  }
};

exports.approveRequest = async (req, res) => {
  const { id: request_id } = req.params; // request_id from URL
  const approver_user_id = req.user?._id;
  const approver_role = req.user?.role;
  const { supervisor_comments } = req.body;

  console.log(`Vacation Controller (Mongoose): approveRequest hit for request ID: ${request_id} by user ${approver_user_id}`);

  if (!approver_user_id) {
    return res.status(401).json({ message: 'Unauthorized: Approver not identified.' });
  }
  if (!mongoose.Types.ObjectId.isValid(request_id) || !mongoose.Types.ObjectId.isValid(approver_user_id)) {
    return res.status(400).json({ message: 'Invalid ID format for request or approver.' });
  }
  if (approver_role !== 'supervisor' && approver_role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: User is not authorized to approve requests.' });
  }

  try {
    const request = await VacationRequest.findById(request_id);
    if (!request) {
      return res.status(404).json({ message: 'Vacation request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.status}.` });
    }

    if (approver_role === 'supervisor') {
      const isDirectSupervisor = await isSupervisorOf(approver_user_id, request.user_id);
      if (!isDirectSupervisor) {
        return res.status(403).json({ message: 'Forbidden: You are not the direct supervisor for this employee.' });
      }
    }
    // Admin can approve any pending request

    const updatedRequest = await VacationRequest.findByIdAndUpdate(
      request_id,
      {
        status: 'approved',
        approved_by_id: approver_user_id,
        actioned_date: Date.now(),
        supervisor_comments: supervisor_comments || null,
      },
      { new: true } // Returns the updated document
    ).populate({
        path: 'user_id',
        select: 'first_name last_name email location_id',
        populate: { path: 'location_id', select: 'name' }
    }).populate({
        path: 'approved_by_id',
        select: 'first_name last_name email location_id',
        populate: { path: 'location_id', select: 'name' }
    });

    if (!updatedRequest) { // Should not happen if findById found it, but good practice
        return res.status(404).json({ message: 'Vacation request not found after update attempt.' });
    }

    res.status(200).json({ message: 'Vacation request approved successfully.', request: updatedRequest });
  } catch (error) {
    console.error('Error approving vacation request:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: 'Validation error during approval.', errors: messages });
    }
    res.status(500).json({ message: 'Error approving vacation request.', error: error.message });
  }
};

exports.rejectRequest = async (req, res) => {
  const { id: request_id } = req.params; // request_id from URL
  const rejector_user_id = req.user?._id;
  const rejector_role = req.user?.role;
  const { supervisor_comments } = req.body;

  console.log(`Vacation Controller (Mongoose): rejectRequest hit for request ID: ${request_id} by user ${rejector_user_id}`);

  if (!rejector_user_id) {
    return res.status(401).json({ message: 'Unauthorized: User not identified.' });
  }
  if (!mongoose.Types.ObjectId.isValid(request_id) || !mongoose.Types.ObjectId.isValid(rejector_user_id)) {
    return res.status(400).json({ message: 'Invalid ID format for request or rejector.' });
  }
  if (rejector_role !== 'supervisor' && rejector_role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: User is not authorized to reject requests.' });
  }
  if (!supervisor_comments || supervisor_comments.trim() === '') { // Comments are mandatory for rejection
    return res.status(400).json({ message: 'Supervisor comments are required when rejecting a request.' });
  }

  try {
    const request = await VacationRequest.findById(request_id);
    if (!request) {
      return res.status(404).json({ message: 'Vacation request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.status}.` });
    }

    if (rejector_role === 'supervisor') {
      const isDirectSupervisor = await isSupervisorOf(rejector_user_id, request.user_id);
      if (!isDirectSupervisor) {
        return res.status(403).json({ message: 'Forbidden: You are not the direct supervisor for this employee.' });
      }
    }
    // Admin can reject any pending request

    const updatedRequest = await VacationRequest.findByIdAndUpdate(
      request_id,
      {
        status: 'rejected',
        approved_by_id: rejector_user_id, // Still indicates who actioned it
        actioned_date: Date.now(),
        supervisor_comments,
      },
      { new: true }
    ).populate({
        path: 'user_id',
        select: 'first_name last_name email location_id',
        populate: { path: 'location_id', select: 'name' }
    }).populate({
        path: 'approved_by_id',
        select: 'first_name last_name email location_id',
        populate: { path: 'location_id', select: 'name' }
    });

    if (!updatedRequest) {
        return res.status(404).json({ message: 'Vacation request not found after update attempt.' });
    }

    res.status(200).json({ message: 'Vacation request rejected successfully.', request: updatedRequest });
  } catch (error) {
    console.error('Error rejecting vacation request:', error);
     if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: 'Validation error during rejection.', errors: messages });
    }
    res.status(500).json({ message: 'Error rejecting vacation request.', error: error.message });
  }
};
