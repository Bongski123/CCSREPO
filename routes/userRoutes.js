const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('../database/db');
const { authenticateToken, isAdmin, isNCFUser, isNotNCFUser } = require('../authentication/middleware');

const router = express.Router();


// Create a transporter object
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
      user: 'ncfresearchnexus@gmail.com', // Your Gmail address
      pass: 'uvebkflhfwuwqcuk', // Your App Password (make sure to remove any spaces)
  },
});

  
  // Send the verification email after successful registration
  const sendVerificationEmail = (userEmail, userId) => {
    const token = jwt.sign({ userId }, 'Nhel-secret-key', { expiresIn: '1h' });
  
    const verificationLink = `https://ccsrepo.onrender.com/verify-email?token=${token}`;
  
    const mailOptions = {
      from: 'ncfresearchnexus@gmail.com',
      to: userEmail,
      subject: 'Email Verification',
      text: `Please verify your email by clicking the following link: ${verificationLink}`,
    };
  
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log('Error sending email:', err);
      } else {
        console.log('Verification email sent:', info.response);
      }
    });
};

router.post('/register', async (req, res) => {
    try {
        console.log('Received request body:', req.body);  // Log the incoming request body for debugging

        // Destructure the fields sent in the request body
        const { first_name, middle_name, last_name, suffix, email, password, role_id, program_id, institution_id, new_institution_name, new_program_name } = req.body;

        // Check for missing required fields, allowing password to be optional
        if (!first_name || !last_name || !email || !role_id || (!institution_id && !new_institution_name)) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if a user with the same email already exists
        const checkUserByEmailQuery = 'SELECT * FROM users WHERE email = ?';
        const [existingUserByEmailRows] = await db.query(checkUserByEmailQuery, [email]);

        if (existingUserByEmailRows.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // Handle new institution if provided
        let finalInstitutionId = institution_id;
        if (new_institution_name) {
            const insertInstitutionQuery = 'INSERT INTO institution (institution_name) VALUES (?)';
            const [insertedInstitutionResult] = await db.query(insertInstitutionQuery, [new_institution_name]);
            finalInstitutionId = insertedInstitutionResult.insertId;
        }

        // Handle new program if provided
        let finalProgramId = program_id;
        if (new_program_name) {
            const insertProgramQuery = 'INSERT INTO program (program_name) VALUES (?)';
            const [insertedProgramResult] = await db.query(insertProgramQuery, [new_program_name]);
            finalProgramId = insertedProgramResult.insertId;
        }
        if (program_id === '' || program_id === null) {
            finalProgramId = null;
        }

        // Conditionally hash password if provided (only hash if it's not null)
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        // Insert new user into the users table
        const insertUserQuery = `
            INSERT INTO users (first_name, middle_name, last_name, suffix, email, password, role_id, program_id, institution_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [insertResult] = await db.query(insertUserQuery, [first_name, middle_name || null, last_name, suffix || null, email, hashedPassword, role_id, finalProgramId, finalInstitutionId]);

        const userId = insertResult.insertId;  // Get the userId from the inserted row

        // Send the verification email
        sendVerificationEmail(email, userId);
        res.status(201).json({ message: 'User Registered Successfully' });

    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'User Registration Endpoint Error!' });
    }
});




router.get('/users/all', async (req, res) => {
    try {
      // SQL query to fetch all items from the 'users' table
      const query = `
        SELECT 
    u.user_id, 
    CONCAT(
        u.first_name, ' ',
        COALESCE(CONCAT(u.middle_name, ' '), ''), 
        u.last_name, 
        COALESCE(CONCAT(', ', u.suffix), '')
    ) AS full_name, -- Combine name fields into a full name
    u.email, 
    u.password, 
    u.role_id, 
    u.program_id, 
    COALESCE(i.institution_name, 'N/A') AS institution, -- Handle missing institution
    r.role_name, 
    COALESCE(p.program_name, 'N/A') AS program_name -- Handle missing program
FROM 
    users u
JOIN 
    roles r ON u.role_id = r.role_id
LEFT JOIN 
    program p ON u.program_id = p.program_id
LEFT JOIN 
    institution i ON u.institution_id = i.institution_id;

      `;
  
      // Execute the query
      const [rows] = await db.query(query);
  
      // If no records are found, return a message
      if (rows.length === 0) {
        return res.status(404).json({ message: 'No users found.' });
      }
  
      // Return the retrieved rows (all user data)
      res.status(200).json({ users: rows });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'An error occurred while fetching the users.' });
    }
  });


// Get User by ID
router.get('/users/:user_id', async (req, res) => {
  try {
      const userId = req.params.user_id;

      if (!userId) {
          return res.status(400).json({ error: 'Please provide user id' });
      }

      const getUserQuery = `SELECT user_id, email, first_name, last_name, role_id, institution_id, program_id FROM users WHERE user_id = ?`;
      const [rows] = await db.query(getUserQuery, [userId]);

      if (rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }

      // Return user data including first and last name
      res.status(200).json({ user: rows[0] });
  } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update User Information
router.put('/users/update/:userId', (req, res) => {
  const userId = req.params.userId;
  const { first_name, middle_name, last_name, suffix, email, role_id, institution_id, program_id } = req.body;

  // Ensure that the request body contains the necessary fields
  if (!first_name || !last_name || !role_id || !institution_id || !program_id ) {
      return res.status(400).json({ message: 'Missing required fields' });
  }

  // Prepare the query
  const query = `
    UPDATE users
    SET 
      first_name = ?, 
      middle_name = ?, 
      last_name = ?, 
      suffix = ?, 
      email = ?, 
      role_id = ?, 
      institution_id = ?, 
      program_id = ?
    WHERE user_id = ?`;

  // Perform the update query
  db.query(query, [first_name, middle_name, last_name, suffix, email, role_id, institution_id, program_id, userId], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Error updating user data' });
      }
      if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ message: 'User updated successfully' });
  });
});

// Delete User
router.delete('/users/delete/:userId', async (req, res) => {
  try {
      const userId = req.params.userId;

      if (!userId) {
          return res.status(400).json({ error: 'Please provide user id' });
      }

      // Check if user exists before deleting
      const checkUserQuery = 'SELECT * FROM users WHERE user_id = ?';
      const [user] = await db.query(checkUserQuery, [userId]);

      if (user.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }

      // Delete the user
      const deleteUserQuery = 'DELETE FROM users WHERE user_id = ?';
      const [deleteResult] = await db.query(deleteUserQuery, [userId]);

      if (deleteResult.affectedRows === 0) {
          return res.status(404).json({ error: 'Failed to delete user' });
      }

      res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/programs/all', async (req, res) => {
    try {
        const getAllProgramsQuery = 'SELECT * FROM program;';
        const [rows] = await db.query(getAllProgramsQuery);

        res.status(200).json({ programs: rows });
    } catch (error) {
        console.error('Error getting programs:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
