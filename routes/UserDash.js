const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const {authenticateToken} = require('../authentication/middleware');

const router = express.Router();

// ----ROLES DATA----

router.get('/notifications/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params; // Extract user_id from the request parameters

        // Query to fetch notifications for the specified user
        const query = 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC';
        const [notifications] = await db.query(query, [user_id]); // Use user_id here

        if (notifications.length === 0) {
            return res.status(404).json({ message: 'No notifications found for this user.' });
        }

        // Send the notifications as a response
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error retrieving notifications:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Example route for rejecting a research submission
router.post('/reject-research/:research_id', async (req, res) => {
    const { research_id } = req.params;
    const { user_id } = req.body; // Assuming you send user_id in the body

    try {
        await rejectResearchSubmission(research_id, user_id);
        res.status(200).json({ message: 'Research submission rejected and notification sent.' });
    } catch (error) {
        console.error('Error handling rejection:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Endpoint to mark notifications as read
router.post('/notifications/opened', (req, res) => {
    const { userId } = req.body; // Get userId from the request body

    // Update the notifications to mark them as read for the specified user
    const query = 'UPDATE notifications SET opened = 1 WHERE user_id = ? AND opened = 0';

    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error updating notifications:', err);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        return res.status(200).json({ message: 'Notifications marked as read', affectedRows: result.affectedRows });
    });
});




router.post('/collection/add', async (req, res) => {
    const { user_id, research_id } = req.body;

    if (!user_id || !research_id) {
        return res.status(400).json({ message: 'User ID and Research ID are required.' });
    }

    try {
        const query = 'INSERT INTO collections (user_id, research_id) VALUES (?, ?)';
        const result = await db.query(query, [user_id, research_id]);

        res.status(201).json({ message: 'Added to collection successfully!', result });
    } catch (error) {
        console.error('Error adding to collection:', error);
        res.status(500).json({ message: 'Could not add to collection. Please try again.' });
    }
});




router.get('/collections/:userId', async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    }

    try {
        const query = `
            SELECT r.research_id, r.title
            FROM collections c
            JOIN researches r ON c.research_id = r.research_id
            WHERE c.user_id = ?`;

        const collections = await db.query(query, [userId]);

        if (!collections.length) {
            return res.status(404).json({ message: 'No collections found.' });
        }

        res.json(collections);
    } catch (error) {
        console.error('Error fetching collections:', error);
        res.status(500).json({ message: 'Could not fetch collections. Please try again later.' });
    }
});

router.delete('/collection/remove/:userId/:researchId', async (req, res) => {
    const { userId, researchId } = req.params;

    if (!userId || !researchId) {
        return res.status(400).json({ message: 'User ID and Research ID are required.' });
    }

    try {
        // Query to delete the collection entry
        const query = `
            DELETE FROM collections
            WHERE user_id = ? AND research_id = ?`;

        const result = await db.query(query, [userId, researchId]);

        // Check if any row was affected (deleted)
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Collection item not found.' });
        }

        res.status(200).json({ message: 'Collection item removed successfully.' });
    } catch (error) {
        console.error('Error removing collection item:', error);
        res.status(500).json({ message: 'Could not remove collection item. Please try again later.' });
    }
});


module.exports = router;




