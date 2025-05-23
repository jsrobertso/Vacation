// In backend-api/src/routes/vacation.routes.js
const express = require('express');
const router = express.Router();
const vacationController = require('../controllers/vacation.controller');
const { protect, authorize } = require('../middleware/auth.middleware'); // Import actual middleware

// Apply the 'protect' middleware to all vacation routes by default.
// This ensures that a user must be logged in to access any of these endpoints.
router.use(protect);

// Route to submit a new vacation request
// Accessible by any authenticated user (employee, supervisor, admin)
router.post('/', vacationController.submitRequest);

// Route to get all vacation requests for the logged-in employee
// Accessible by any authenticated user (primarily for 'employee' role)
router.get('/employee', vacationController.getEmployeeRequests);

// Route to get pending vacation requests for a supervisor's team
// Accessible only by users with 'supervisor' or 'admin' roles
router.get('/supervisor', authorize('supervisor', 'admin'), vacationController.getSupervisorRequests);

// Route to approve a vacation request
// Accessible only by users with 'supervisor' or 'admin' roles
router.put('/:id/approve', authorize('supervisor', 'admin'), vacationController.approveRequest);

// Route to reject a vacation request
// Accessible only by users with 'supervisor' or 'admin' roles
router.put('/:id/reject', authorize('supervisor', 'admin'), vacationController.rejectRequest);

module.exports = router;
