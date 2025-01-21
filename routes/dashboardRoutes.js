const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const {authenticateToken, isAdmin, isNCFUser, isNotNCFUser } = require('../authentication/middleware');

const router = express.Router();





router.get('/top-downloads', async (req, res) => {
    const query = `
          SELECT 
    r.research_id,
    r.title, 
    r.abstract,
    r.publish_date,
    r.status,
    r.file_privacy,
    COALESCE(d.download_count, 0) AS downloadCount,  -- Directly getting the download_count from downloads table
    COALESCE(GROUP_CONCAT(DISTINCT a.author_name ORDER BY a.author_name), 'Unknown') AS authors,  -- Concatenating authors
    COALESCE(GROUP_CONCAT(DISTINCT c.category_name ORDER BY c.category_name), 'Uncategorized') AS category,  -- Concatenating categories
    COALESCE(GROUP_CONCAT(DISTINCT k.keyword_name ORDER BY k.keyword_name), 'No Keywords') AS keywords  -- Concatenating keywords
FROM researches r
LEFT JOIN research_authors ra ON r.research_id = ra.research_id
LEFT JOIN authors a ON ra.author_id = a.author_id
LEFT JOIN research_categories rc ON r.research_id = rc.research_id
LEFT JOIN category c ON rc.category_id = c.category_id
LEFT JOIN research_keywords rk ON r.research_id = rk.research_id
LEFT JOIN keywords k ON rk.keyword_id = k.keyword_id
LEFT JOIN downloads d ON r.research_id = d.research_id  -- Join with the downloads table
WHERE r.status = 'approved'
GROUP BY r.research_id, r.title, r.abstract, r.publish_date, r.status, r.file_privacy, d.download_count
ORDER BY downloadCount DESC
LIMIT 10;
    `;

    try {
        const [results] = await db.query(query);
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching top downloads:', error.message, error.stack);
        res.status(500).json({ 
            error: 'Failed to fetch top downloads.', 
            details: error.message 
        });
    }
});

router.get('/trending-searches', async (req, res) => {
    const fetchQuery = `
      SELECT 
        r.research_id,
        r.title, 
        r.publish_date,
        r.abstract,
        r.status,
        r.file_privacy,
        COALESCE(GROUP_CONCAT(DISTINCT a.author_name ORDER BY a.author_name), 'Unknown') AS authors,
        COALESCE(GROUP_CONCAT(DISTINCT c.category_name ORDER BY c.category_name), 'Uncategorized') AS category,
        COALESCE(GROUP_CONCAT(DISTINCT k.keyword_name ORDER BY k.keyword_name), 'No Keywords') AS keywords,
        COALESCE(sl.search_count, 0) AS searchCount,
        COALESCE(SUM(d.download_count), 0) AS totalDownloads,  -- Summing total downloads
        COALESCE(SUM(v.view_count), 0) AS totalViews  -- Summing total views
      FROM 
        researches r
      LEFT JOIN research_authors ra ON r.research_id = ra.research_id
      LEFT JOIN authors a ON ra.author_id = a.author_id
      LEFT JOIN research_categories rc ON r.research_id = rc.research_id
      LEFT JOIN category c ON rc.category_id = c.category_id
      LEFT JOIN research_keywords rk ON r.research_id = rk.research_id
      LEFT JOIN keywords k ON rk.keyword_id = k.keyword_id
      LEFT JOIN (
          SELECT 
              r.research_id, 
              COUNT(sl.search_id) AS search_count
          FROM 
              researches r
          JOIN 
              search_logs sl ON r.research_id = sl.research_id
          GROUP BY 
              r.research_id
      ) sl ON r.research_id = sl.research_id
      LEFT JOIN downloads d ON r.research_id = d.research_id  -- Join with downloads table for total downloads
      LEFT JOIN views v ON r.research_id = v.research_id  -- Join with views table for total views
      WHERE 
          r.status = 'approved'
      GROUP BY 
          r.research_id, r.title, r.abstract, r.publish_date, r.status, r.file_privacy
      ORDER BY 
          searchCount DESC
      LIMIT 10;
    `;

    try {
        const [results] = await db.query(fetchQuery);
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching trending researches:', error.message, error.stack);
        res.status(500).json({ 
            error: 'Failed to fetch trending researches.', 
            details: error.message 
        });
    }
});


  // POST route to log a search
router.post('/log-search', (req, res) => {
    const { researchId } = req.body;
  
    if (!researchId) {
      return res.status(400).json({ error: 'Research ID is required' });
    }
  
    // SQL query to insert a search log
    const logQuery = 'INSERT INTO search_logs (research_id) VALUES (?)';
    db.query(logQuery, [researchId], (err) => {
      if (err) {
        console.error('Error logging search:', err);
        return res.status(500).json({ error: 'Error logging search' });
      }
      console.log('Search logged successfully');
      res.status(200).json({ message: 'Search logged successfully' });
    });
  });
  
module.exports = router;