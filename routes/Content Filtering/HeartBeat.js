const express = require('express');

const db = require('../../database/db'); // Import database connection

const router = express.Router();


router.post('/admin/heartbeat/:userId', async (req, res) => {
  const userId = req.params.userId;

  // Using a Promise to handle the asynchronous query
  const query = 'UPDATE users SET last_active = NOW() WHERE user_id = ?';

  try {
    // Promisified query
    const [result] = await db.query(query, [userId]);
    
    // Check if the update was successful
    if (result.affectedRows > 0) {
      return res.status(200).send('Heartbeat updated successfully');
    } else {
      return res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error updating heartbeat');
  }
});


// Example route to get online users
router.get('/admin/online-users', async (req, res) => {
  const threshold = 1 * 60; 

  // Query to find users who have been active in the last 5 minutes
  const query = `
    SELECT user_id, first_name, last_name, email, last_active
    FROM users
    WHERE last_active > NOW() - INTERVAL ${threshold} SECOND
  `;

  try {
    // Execute the query
    const [result] = await db.query(query);

    if (result.length > 0) {
      return res.status(200).json({
        onlineUsers: result,
      });
    } else {
      return res.status(404).send('No users are currently online');
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error fetching online users');
  }
});


// Backend route to update user status to offline
router.post('/admin/logout/:userId', async (req, res) => {
  const userId = req.params.userId;

  // Update last_active field to NULL or old timestamp when logging out
  const query = 'UPDATE users SET last_active = NULL WHERE user_id = ?';

  try {
    const [result] = await db.query(query, [userId]);

    if (result.affectedRows > 0) {
      return res.status(200).send('User logged out successfully');
    } else {
      return res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error logging out user');
  }
});


  module.exports = router;