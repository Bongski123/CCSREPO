const express = require('express');
const db = require('../database/db');

const router = express.Router();


const getGeolocation = async (ip) => {
    const apiToken = 'YOUR_API_TOKEN'; // Replace with your actual API token
    try {
      const response = await axios.get(`https://ipinfo.io/${ip}/json?token=${apiToken}`);
      return response.data; // This will contain the location information
    } catch (error) {
      console.error('Error fetching geolocation:', error);
      return null;
    }
  };
  

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


router.get('/notifications/:notificationId/researches',  (req, res) => {
    const notificationId = req.params.notificationId;

    // Query to fetch the research details associated with a specific notification
    const query = `
         SELECT r.research_id, r.title
        FROM researches r 
        JOIN notifications n ON n.research_id = r.research_id 
        WHERE n.notification_id = ?`;
        
    db.query(query, [notificationId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching researches' });
        }
        res.json(results);
    });
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
  try {
    // Get user_id from the query parameters
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({ message: 'User ID not provided.' });
    }

    // Query to fetch total downloads, citations, views, and researches for the user
    const [results] = await db.query(`
      SELECT 
          COALESCE(SUM(d.downloadCount), 0) AS total_downloads,
          COALESCE(SUM(c.citation_count), 0) AS total_citations,
          COALESCE(COUNT(r.research_id), 0) AS total_researches,
          COALESCE(SUM(v.viewCount), 0) AS total_views
      FROM researches r
      LEFT JOIN downloads d ON r.research_id = d.research_id
      LEFT JOIN citations c ON r.research_id = c.research_id
      LEFT JOIN views v ON r.research_id = v.research_id
      WHERE r.uploader_id = ?
    `, [userId]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No data found for the provided user ID.' });
    }

    // Send the data in the response
    res.json({
      total_downloads: results[0].total_downloads,
      total_citations: results[0].total_citations,
      total_researches: results[0].total_researches,
      total_views: results[0].total_views
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/total/researches/:user_id', async (req, res) => {
  try {
    const userId = req.params.user_id;
    const [results] = await db.query(`
      SELECT COUNT(*) AS total_researches
      FROM researches r
      WHERE r.uploader_id = ?
    `, [userId]);
    res.json(results[0]);
  } catch (error) {
    console.error('Error fetching total researches:', error);
    res.status(500).send('Server error');
  }
});


// Get total citations for a specific uploader_id
router.get('/total/citations/:research_id', async (req, res) => {
  try {
    const userId = req.params.research_id;
    const [results] = await db.query(`
      SELECT SUM(c.citation_count) AS total_citations
      FROM citations c
      JOIN researches r ON c.research_id = r.research_id
      WHERE r.uploader_id = ?
    `, [userId]);
    res.json(results[0]);
  } catch (error) {
    console.error('Error fetching total citations:', error);
    res.status(500).send('Server error');
  }
});

// Get total downloads for a specific uploader_id
router.get('/total/downloads/:research_id', async (req, res) => {
  try {
    const userId = req.params.research_id;
    const [results] = await db.query(`
      SELECT COUNT(*) AS total_downloads
      FROM downloads d
      JOIN researches r ON d.research_id = r.research_id
      WHERE r.uploader_id = ?
    `, [userId]);
    res.json(results[0]);
  } catch (error) {
    console.error('Error fetching total downloads:', error);
    res.status(500).send('Server error');
  }
});

router.get('/total/views/:research_id', async (req, res) => {
  try {
    const userId = req.params.research_id;
    const [results] = await db.query(`
      SELECT COUNT(*) AS total_views
      FROM views v
      JOIN researches r ON v.research_id = r.research_id
      WHERE r.uploader_id = ?
    `, [userId]);
    res.json(results[0]);
  } catch (error) {
    console.error('Error fetching total downloads:', error);
    res.status(500).send('Server error');
  }
});

// Get daily citation counts for a specific uploader_id
router.get('/user/daily/citations/:research_id', async (req, res) => {
  try {
    const userId = req.params.research_id;
    const [results] = await db.query(`
      SELECT DATE(c.datetime) AS date, SUM(c.citation_count) AS citations
      FROM citations c
      JOIN researches r ON c.research_id = r.research_id
      WHERE r.uploader_id = ?
      GROUP BY DATE(c.datetime)
      ORDER BY DATE(c.datetime) ASC
    `, [userId]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching daily citations:', error);
    res.status(500).send('Server error');
  }
});

// Get daily download counts for a specific uploader_id
router.get('/user/daily/downloads/:research_id', async (req, res) => {
  try {
    const userId = req.params.research_id;
    const [results] = await db.query(`
      SELECT DATE(c.datetime) AS date, SUM(c.download_count) AS citations
      FROM downloads c
      JOIN researches r ON c.research_id = r.research_id
      WHERE r.uploader_id = ?
      GROUP BY DATE(c.datetime)
      ORDER BY DATE(c.datetime) ASC
    `, [userId]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching daily citations:', error);
    res.status(500).send('Server error');
  }
});


// Get daily view counts for a specific uploader_id
router.get('/user/daily/views/:research_id', async (req, res) => {
  try {
    const userId = req.params.research_id;
    const [results] = await db.query(`
      SELECT DATE(v.datetime) AS date, COUNT(*) AS views
      FROM views v
      JOIN researches r ON v.research_id = r.research_id
      WHERE r.uploader_id = ?
      GROUP BY DATE(v.datetime)
      ORDER BY DATE(v.datetime) ASC
    `, [userId]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching daily views:', error);
    res.status(500).send('Server error');
  }
});

// Get weekly citation counts for a specific uploader_id
router.get('/user/weekly/citations/:research_id', async (req, res) => {
  try {
    const userId = req.params.research_id;
    const [results] = await db.query(`
      SELECT YEAR(c.datetime) AS year, WEEK(c.datetime) AS week, SUM(c.citation_count) AS citations
      FROM citations c
      JOIN researches r ON c.research_id = r.research_id
      WHERE r.uploader_id = ?
      GROUP BY YEAR(c.datetime), WEEK(c.datetime)
      ORDER BY YEAR(c.datetime), WEEK(c.datetime) ASC
    `, [userId]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching weekly citations:', error);
    res.status(500).send('Server error');
  }
});

// Get weekly download counts for a specific uploader_id
router.get('/user/weekly/downloads/:research_id', async (req, res) => {
  try {
    const userId = req.params.research_id;
    const [results] = await db.query(`
      SELECT YEAR(d.datetime) AS year, WEEK(d.datetime) AS week, COUNT(*) AS downloads
      FROM downloads d
      JOIN researches r ON d.research_id = r.research_id
      WHERE r.uploader_id = ?
      GROUP BY YEAR(d.datetime), WEEK(d.datetime)
      ORDER BY YEAR(d.datetime), WEEK(d.datetime) ASC
    `, [userId]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching weekly downloads:', error);
    res.status(500).send('Server error');
  }
});

// Get weekly view counts for a specific uploader_id
router.get('/user/weekly/views/:research_id', async (req, res) => {
  try {
    const userId = req.params.research_id;
    const [results] = await db.query(`
      SELECT YEAR(v.datetime) AS year, WEEK(v.datetime) AS week, COUNT(*) AS views
      FROM views v
      JOIN researches r ON v.research_id = r.research_id
      WHERE r.uploader_id = ?
      GROUP BY YEAR(v.datetime), WEEK(v.datetime)
      ORDER BY YEAR(v.datetime), WEEK(v.datetime) ASC
    `, [userId]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching weekly views:', error);
    res.status(500).send('Server error');
  }
});

// Get monthly citation counts for a specific uploader_id
router.get('/user/monthly/citations/:research_id', async (req, res) => {
  try {
    const userId = req.params.research_id;
    const [results] = await db.query(`
      SELECT YEAR(c.datetime) AS year, MONTH(c.datetime) AS month, SUM(c.citation_count) AS citations
      FROM citations c
      JOIN researches r ON c.research_id = r.research_id
      WHERE r.uploader_id = ?
      GROUP BY YEAR(c.datetime), MONTH(c.datetime)
      ORDER BY YEAR(c.datetime), MONTH(c.datetime) ASC
    `, [userId]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching monthly citations:', error);
    res.status(500).send('Server error');
  }
});

// Get monthly download counts for a specific uploader_id
router.get('/user/monthly/downloads/:research_id', async (req, res) => {
  try {
    const userId = req.params.research_id;
    const [results] = await db.query(`
      SELECT YEAR(d.datetime) AS year, MONTH(d.datetime) AS month, COUNT(*) AS downloads
      FROM downloads d
      JOIN researches r ON d.research_id = r.research_id
      WHERE r.uploader_id = ?
      GROUP BY YEAR(d.datetime), MONTH(d.datetime)
      ORDER BY YEAR(d.datetime), MONTH(d.datetime) ASC
    `, [userId]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching monthly downloads:', error);
    res.status(500).send('Server error');
  }
});

// Get monthly view counts for a specific uploader_id
router.get('/user/monthly/views/:research_id', async (req, res) => {
  try {
    const userId = req.params.research_id;
    const [results] = await db.query(`
      SELECT YEAR(v.datetime) AS year, MONTH(v.datetime) AS month, COUNT(*) AS views
      FROM views v
      JOIN researches r ON v.research_id = r.research_id
      WHERE r.uploader_id = ?
      GROUP BY YEAR(v.datetime), MONTH(v.datetime)
      ORDER BY YEAR(v.datetime), MONTH(v.datetime) ASC
    `, [userId]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching monthly views:', error);
    res.status(500).send('Server error');
  }
});

    
  


  router.get('/user/location', async (req, res) => {
    try {
        const userIPResponse = await axios.get('https://api.ipify.org?format=json');
        const { ip } = userIPResponse.data;

        const locationResponse = await axios.get(`https://ipinfo.io/${ip}/json?token=${process.env.IPINFO_TOKEN}`);
        res.json(locationResponse.data);
    } catch (error) {
        console.error('Error fetching location:', error);
        res.status(500).send('Server error');
    }
});







router.get('/:user_id/papers', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { status } = req.query; // Get status from query params (approved, rejected)

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status query parameter. Use "approved" or "rejected".' });
        }

        // Query papers based on user_id and status
        const query = 'SELECT * FROM research_papers WHERE uploader_id = ? AND status = ? ORDER BY created_at DESC';
        const [papers] = await db.query(query, [user_id, status]);

        if (papers.length === 0) {
            return res.status(404).json({ message: `No ${status} papers found for this user.` });
        }

        res.status(200).json(papers);
    } catch (error) {
        console.error('Error retrieving papers:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



router.put('/research/:researchId/abstract', (req, res) => {
  const { researchId } = req.params;
  const { abstract } = req.body;

  if (!abstract) {
    return res.status(400).json({ message: 'Abstract is required' });
  }

  const query = 'UPDATE researches SET abstract = ? WHERE research_id = ?';

  db.query(query, [abstract, researchId], (err, result) => {
    if (err) {
      console.error('Error updating abstract:', err);
      return res.status(500).json({ message: 'Error updating abstract' });
    }

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: 'Abstract updated successfully' });
    } else {
      return res.status(404).json({ message: 'Research not found' });
    }
  });
});



  



module.exports = router;
