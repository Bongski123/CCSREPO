const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const {authenticateToken, isAdmin, isNCFUser, isNotNCFUser } = require('../authentication/middleware');

const router = express.Router();

// Citations Management
// Increment citation count for each document
router.patch('/citations/:research_id', (req, res) => {

    const researchId = req.params.research_id;

    // Update citation count in the database
    const updateQuery = 'UPDATE researches SET citeCount = citeCount + 1 WHERE research_id = ?';

    db.query(updateQuery, [researchId], (error, result) => {

        if (error) {
            console.error('Error updating citation count:', error);
            res.status(500).json({ error: 'An error occurred while updating citation count' });
        } else {
            res.status(200).json({ message: 'Citation count updated successfully' });
        }
    });
});

// Get the citation count of a document
router.get('/citations/:research_id', (req, res) => {

    const researchId = req.params.research_id;

    // Get the citation count from the database
    const getCitedQuery = 'SELECT citeCount FROM researches WHERE research_id = ?';

    db.query(getCitedQuery, [researchId], (error, result) => {

        if (error) {
            console.error('Error getting citation count:', error);
            res.status(500).json({ error: 'An error occurred while getting citation count' });
        } else if (result.length === 0) {
            res.status(404).json({ error: 'Document not found' });
        } else {
            res.status(200).json({ citationCount: result[0].citeCount });
        }
    });

});

// Get the citation count of all documents
router.get('/citations', (req, res) => {

    // Get the citation count from the database
    const getCitedQuery = 'SELECT research_id, citeCount FROM researches';

    db.query(getCitedQuery, (error, result) => {

        if (error) {
            console.error('Error getting total citation count:', error);
            res.status(500).json({ error: 'An error occurred while getting total citation count' });
        } else {
            res.status(200).json(result);
        }
    });

});

// Get the total citation count of all documents
router.post('/total/citations', (req, res) => {
    // Use SQL to sum the citation counts
    const getTotalCitesQuery = 'SELECT SUM(citeCount) AS totalCitation FROM researches';

    db.query(getTotalCitesQuery, (error, result) => {
        if (error) {
            console.error('Error getting total citation count:', error);
            res.status(500).json({ error: 'An error occurred while getting total citation count' });
        } else {
            const totalCitation = result[0].totalCitation || 0; // Handle case where result is NULL
            res.status(200).json({ totalCitation });
        }
    });
});



// Increment download count for each document
router.post('/downloads/:research_id', (req, res) => {

    const researchId = req.params.research_id;

    // Update citation count in the database
    const updateQuery = 'UPDATE researches SET downloadCount = downloadCount + 1 WHERE research_id = ?';

    db.query(updateQuery, [researchId], (error, result) => {

        if (error) {
            console.error('Error updating download count:', error);
            res.status(500).json({ error: 'An error occurred while updating download count' });
        } else {
            res.status(200).json({ message: 'Download count updated successfully' });
        }
    });
});

// Get the download count of a document
router.get('/downloads/:research_id', (req, res) => {
    const researchId = req.params.research_id;

    const getDownloadedQuery = 'SELECT downloadCount FROM researches WHERE research_id = ?';

    db.query(getDownloadedQuery, [researchId], (error, result) => {
        if (error) {
            console.error('Error getting download count:', error);
            res.status(500).json({ error: 'An error occurred while getting download count' });
        } else if (result.length === 0) {
            res.status(404).json({ error: 'Document not found' });
        } else {
            res.status(200).json({ downloadCount: result[0].downloadCount });
        }
    });
});


// Get the download count of all documents
router.get('/downloads', (req, res) => {

    const getDownloadedQuery = 'SELECT research_id, downloadCount FROM researches';

    db.query(getDownloadedQuery, (error, result) => {

        if (error) {
            console.error('Error getting total download count:', error);
            res.status(500).json({ error: 'An error occurred while getting total download count' });
        } else {
            res.status(200).json(result);
        }
    });

});

router.post('/total/downloads', (req, res) => {
    // Use SQL to sum the download counts
    const getTotalDownloadsQuery = 'SELECT SUM(downloadCount) AS totalDownloads FROM researches';

    db.query(getTotalDownloadsQuery, (error, result) => {
        if (error) {
            console.error('Error getting total download count:', error);
            res.status(500).json({ error: 'An error occurred while getting total download count' });
        } else {
            const totalDownloads = result[0].totalDownloads || 0;
            res.status(200).json({ totalDownloads });
        }
    });
});


router.get('/top-downloads', async (req, res) => {
    const query = `
      SELECT 
    r.research_id,
    r.title, 
    r.abstract,
    r.publish_date,
    r.status,
    r.file_privacy,
    COALESCE(r.downloadCount, 0) AS downloadCount, 
    COALESCE(GROUP_CONCAT(DISTINCT a.author_name ORDER BY a.author_name), 'Unknown') AS authors,
    COALESCE(GROUP_CONCAT(DISTINCT c.category_name ORDER BY c.category_name), 'Uncategorized') AS category,
    COALESCE(GROUP_CONCAT(DISTINCT k.keyword_name ORDER BY k.keyword_name), 'No Keywords') AS keywords
FROM researches r
LEFT JOIN research_authors ra ON r.research_id = ra.research_id
LEFT JOIN authors a ON ra.author_id = a.author_id
LEFT JOIN research_categories rc ON r.research_id = rc.research_id
LEFT JOIN category c ON rc.category_id = c.category_id
LEFT JOIN research_keywords rk ON r.research_id = rk.research_id
LEFT JOIN keywords k ON rk.keyword_id = k.keyword_id
WHERE r.status = 'approved' 
GROUP BY r.research_id, r.title, r.downloadCount
ORDER BY r.downloadCount DESC
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

router.get('/trending-searches',async (req, res) => {
    // SQL query to get the top 10 most searched papers
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
    COALESCE(sl.search_count, 0) AS searchCount
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
WHERE 
    r.status = 'approved'
GROUP BY 
    r.research_id, r.title, r.abstract
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