const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const connectDB = require('../src/config/database'); // Assuming this exports the connect function
const User = require('../src/models/user.model');
const Location = require('../src/models/location.model');

// --- Configuration ---
// For simplicity, we'll use a default MONGODB_URI if not set in environment,
// matching what's in src/config/database.js.
// In a real production scenario, ensure environment variables are properly managed.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vacation_db_mongo';

// --- Seed Data ---
const rawLocationsData = [
  { name: 'Headquarters', address: '123 Main St, Anytown, USA' },
  { name: 'North Branch', address: '456 North Rd, Frostburg, USA' },
  { name: 'West Campus', address: '789 West Blvd, Sunnyshore, USA' },
];

const rawUsersData = [
  // Admin
  {
    first_name: 'Admin', last_name: 'User', email: 'admin@example.com',
    raw_password: 'password123', role: 'admin', location_name_ref: 'Headquarters',
    employee_id_internal: 'ADM001',
  },
  // Supervisors
  {
    first_name: 'Sup', last_name: 'One', email: 'sup.one@example.com',
    raw_password: 'password123', role: 'supervisor', location_name_ref: 'Headquarters',
    employee_id_internal: 'SUP001',
  },
  {
    first_name: 'Sup', last_name: 'Two', email: 'sup.two@example.com',
    raw_password: 'password123', role: 'supervisor', location_name_ref: 'North Branch',
    employee_id_internal: 'SUP002',
  },
   {
    first_name: 'Sup', last_name: 'Three', email: 'sup.three@example.com',
    raw_password: 'password123', role: 'supervisor', location_name_ref: 'West Campus',
    employee_id_internal: 'SUP003',
  },
  // Employees
  {
    first_name: 'Emp', last_name: 'Alpha', email: 'emp.alpha@example.com',
    raw_password: 'password123', role: 'employee', location_name_ref: 'Headquarters',
    supervisor_email_ref: 'sup.one@example.com', employee_id_internal: 'EMP001',
  },
  {
    first_name: 'Emp', last_name: 'Beta', email: 'emp.beta@example.com',
    raw_password: 'password123', role: 'employee', location_name_ref: 'Headquarters',
    supervisor_email_ref: 'sup.one@example.com', employee_id_internal: 'EMP002',
  },
  {
    first_name: 'Emp', last_name: 'Gamma', email: 'emp.gamma@example.com',
    raw_password: 'password123', role: 'employee', location_name_ref: 'North Branch',
    supervisor_email_ref: 'sup.two@example.com', employee_id_internal: 'EMP003',
  },
  {
    first_name: 'Emp', last_name: 'Delta', email: 'emp.delta@example.com',
    raw_password: 'password123', role: 'employee', location_name_ref: 'West Campus',
    supervisor_email_ref: 'sup.three@example.com', employee_id_internal: 'EMP004',
  },
  {
    first_name: 'Emp', last_name: 'Orphan', email: 'emp.orphan@example.com', // No supervisor, reports to admin/site lead
    raw_password: 'password123', role: 'employee', location_name_ref: 'West Campus',
    employee_id_internal: 'EMP005',
  },
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB using the connectDB function if it handles connection logic
    // or directly using mongoose.connect if connectDB is just the URI string.
    // Assuming connectDB is a function that establishes the connection:
    if (typeof connectDB === 'function') {
        await connectDB();
    } else {
        // Fallback if connectDB is not a function (e.g. if it's the URI string)
        // This should align with how src/config/database.js is structured.
        // For this script, we'll directly connect.
        await mongoose.connect(MONGODB_URI, {
            // useNewUrlParser: true, // Deprecated in Mongoose 6+
            // useUnifiedTopology: true, // Deprecated in Mongoose 6+
        });
        console.log('MongoDB connected via mongoose.connect in seed script...');
    }


    console.log('Starting database seeding process...');

    // Clear existing data
    console.log('Clearing existing Location data...');
    await Location.deleteMany({});
    console.log('Location data cleared.');

    console.log('Clearing existing User data...');
    await User.deleteMany({});
    console.log('User data cleared.');

    // Insert Locations
    console.log('Inserting locations...');
    const insertedLocations = await Location.insertMany(rawLocationsData);
    console.log(`${insertedLocations.length} locations inserted successfully.`);

    // Prepare User Data
    console.log('Preparing user data...');
    const saltRounds = 10;
    const usersToInsert = [];

    // Create a map for quick location ID lookup
    const locationMap = insertedLocations.reduce((map, loc) => {
      map[loc.name] = loc._id;
      return map;
    }, {});

    // Hash passwords and map location names to ObjectIds
    // First pass for all users to get their _ids, especially supervisors
    const tempUserMap = {}; // To hold users before supervisor assignment

    for (const userData of rawUsersData) {
      const password_hash = await bcryptjs.hash(userData.raw_password, saltRounds);
      const location_id = locationMap[userData.location_name_ref];

      if (!location_id) {
        console.warn(`Warning: Location "${userData.location_name_ref}" not found for user ${userData.email}. Skipping this user.`);
        continue;
      }
      
      const newUser = {
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        password_hash,
        role: userData.role,
        location_id,
        employee_id_internal: userData.employee_id_internal,
        // supervisor_id will be added in the next step for employees
      };
      // Store temporarily to resolve supervisor_id later by email
      tempUserMap[newUser.email] = newUser;
    }

    // Second pass to assign supervisor_id (if applicable)
    // Note: This approach is simple but has limitations if supervisor data isn't processed first
    // or if supervisors are created in the same batch without knowing their future _id.
    // A more robust way for bulk inserts with relations is to insert supervisors first,
    // then query their _ids, then prepare and insert employees.
    // For this script's scale, we'll do it in memory.

    // To handle supervisor assignment correctly, we first insert non-employee users (admin, supervisors)
    const nonEmployeeUsers = Object.values(tempUserMap).filter(u => u.role !== 'employee');
    const insertedNonEmployeeUsers = await User.insertMany(nonEmployeeUsers);
    console.log(`${insertedNonEmployeeUsers.length} admin/supervisor users inserted.`);

    // Update tempUserMap with actual _ids for supervisors
    insertedNonEmployeeUsers.forEach(u => {
        tempUserMap[u.email]._id = u._id; // Add the actual _id
    });
    
    // Now prepare and insert employee users
    const employeeUsersToCreate = [];
    for (const userData of rawUsersData) {
        if (userData.role === 'employee') {
            const employeeData = tempUserMap[userData.email]; // Get pre-processed data
            if (!employeeData) continue; // Already warned if location was missing

            if (userData.supervisor_email_ref) {
                const supervisor = Object.values(tempUserMap).find(u => u.email === userData.supervisor_email_ref && (u.role === 'supervisor' || u.role === 'admin'));
                if (supervisor && supervisor._id) { // Ensure supervisor has an _id (meaning they were inserted)
                    employeeData.supervisor_id = supervisor._id;
                } else {
                    console.warn(`Warning: Supervisor with email "${userData.supervisor_email_ref}" not found for employee ${userData.email}. Assigning null.`);
                    employeeData.supervisor_id = null;
                }
            } else {
                employeeData.supervisor_id = null; // No supervisor specified
            }
            employeeUsersToCreate.push(employeeData);
        }
    }

    if (employeeUsersToCreate.length > 0) {
        const insertedEmployeeUsers = await User.insertMany(employeeUsersToCreate);
        console.log(`${insertedEmployeeUsers.length} employee users inserted successfully.`);
    } else {
        console.log('No employee users to insert in the second pass.');
    }
    
    const totalUsers = insertedNonEmployeeUsers.length + (employeeUsersToCreate.length > 0 ? employeeUsersToCreate.length : 0);
    console.log(`Total of ${totalUsers} users processed and inserted.`);

    console.log('Database seeding completed successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close the Mongoose connection
    console.log('Closing MongoDB connection...');
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
};

// Run the seeder
seedDatabase();
