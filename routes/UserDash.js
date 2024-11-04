const express = require('express');
const db = require('../database/db');

const router = express.Router();

// ----ROLES DATA----

router.get('/notifications/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        const query = 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC';
        const [notifications] = await db.query(query, [user_id]);

        if (notifications.length === 0) {
            return res.status(404).json({ message: 'No notifications found for this user.' });
        }

        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error retrieving notifications:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Example route for rejecting a research submission
router.post('/reject-research/:research_id', async (req, res) => {
    const { research_id } = req.params;
    const { user_id } = req.body;

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
    const { userId } = req.body;

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
   SELECT 
    r.research_id, 
    r.title,
    r.abstract, 
    GROUP_CONCAT(DISTINCT cat.category_name) AS category,  
    GROUP_CONCAT(DISTINCT kw.keyword_name) AS keywords,
    GROUP_CONCAT(DISTINCT a.author_name) AS authors
FROM 
    collections c
JOIN 
    researches r ON c.research_id = r.research_id
LEFT JOIN 
    research_categories rc ON r.research_id = rc.research_id
LEFT JOIN 
    category cat ON rc.category_id = cat.category_id
LEFT JOIN 
    research_keywords rk ON r.research_id = rk.research_id
LEFT JOIN 
    keywords kw ON rk.keyword_id = kw.keyword_id
LEFT JOIN 
    research_authors ra ON r.research_id = ra.research_id
LEFT JOIN 
    authors a ON ra.author_id = a.author_id
WHERE 
    c.user_id = ?
GROUP BY 
    r.research_id, r.title;
`;

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
        const query = `
            DELETE FROM collections
            WHERE user_id = ? AND research_id = ?`;

        const result = await db.query(query, [userId, researchId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Collection item not found.' });
        }

        res.status(200).json({ message: 'Collection item removed successfully.' });
    } catch (error) {
        console.error('Error removing collection item:', error);
        res.status(500).json({ message: 'Could not remove collection item. Please try again later.' });
    }
});

// Endpoint to fetch total downloads, citations, and researches for a specific uploader
router.get('/user/dashboard', async (req, res) => {
    const userId = req.query.user_id; // Get userId from the query parameters

    if (!userId) {
        return res.status(400).json({ message: 'User ID not provided.' });
    }

    try {
        const query = `
            SELECT 
                COALESCE(SUM(r.downloadCount), 0) AS total_downloads,
                COALESCE(SUM(r.citeCount), 0) AS total_citations,
                COALESCE(COUNT(r.research_id), 0) AS total_researches
            FROM researches r
            WHERE r.uploader_id = ?`;

        const [results] = await db.query(query, [userId]);

        res.json({
            total_downloads: results[0].total_downloads,
            total_citations: results[0].total_citations,
            total_researches: results[0].total_researches,
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
module.exports = router;
