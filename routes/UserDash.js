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
    const userId = req.query.user_id; // Get userId from the query parameters

    if (!userId) {
        return res.status(400).json({ message: 'User ID not provided.' });
    }

    try {
        const query = `
            SELECT 
                COALESCE(SUM(r.downloadCount), 0) AS total_downloads,
                COALESCE(SUM(r.citeCount), 0) AS total_citations,
                COALESCE(COUNT(r.research_id), 0) AS total_researches,
                COALESCE(SUM(r.viewCount), 0) AS total_views  
            FROM researches r
            WHERE r.uploader_id = ?`;

        const [results] = await db.query(query, [userId]);

        res.json({
            total_downloads: results[0].total_downloads,
            total_citations: results[0].total_citations,
            total_researches: results[0].total_researches,
            total_views: results[0].total_views,  // Add total views to the response
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Route to get daily downloads for an individual uploader
router.get('/user/total/downloads', async (req, res) => {
    const userId = req.query.userId; // Get the userId from the query parameters
  
    if (!userId) {
      return res.status(400).send('User ID is required');
    }
  
    try {
      const [results] = await db.query(`
        SELECT DATE(publish_date) AS date, SUM(downloadCount) AS downloads 
        FROM researches 
        WHERE uploader_id = ? 
        GROUP BY DATE(publish_date) 
        ORDER BY DATE(publish_date) ASC
      `, [userId]);
  
      res.json(results);
    } catch (error) {
      console.error('Error fetching daily downloads:', error);
      res.status(500).send('Server error');
    }
  });
  
// Route to get daily downloads for an individual uploader (grouped by day of the week)
router.get('/user/daily/downloads', async (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).send('User ID is required');
  }

  try {
    const [results] = await db.query(`
      SELECT 
        DAYOFWEEK(publish_date) AS day_of_week, 
        SUM(downloadCount) AS downloads 
      FROM researches 
      WHERE uploader_id = ? 
      GROUP BY DAYOFWEEK(publish_date) 
      ORDER BY DAYOFWEEK(publish_date) ASC
    `, [userId]);

    // Map day numbers to day names
    const daysMapping = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Format the results to return day names
    const formattedResults = Array(7).fill(0).map((_, index) => {
      const result = results.find(row => row.day_of_week === index + 1);
      return {
        day: daysMapping[index], // Map day number to name
        downloads: result ? result.downloads : 0 // Default to 0 if no data for that day
      };
    });

    res.json(formattedResults);
  } catch (error) {
    console.error('Error fetching daily downloads:', error);
    res.status(500).send('Server error');
  }
});




// Route to get weekly downloads for an individual uploader
router.get('/user/weekly/downloads', async (req, res) => {
    const userId = req.query.userId;
  
    if (!userId) {
      return res.status(400).send('User ID is required');
    }
  
    try {
      const [results] = await db.query(`
        SELECT WEEK(publish_date) AS week, SUM(downloadCount) AS downloads 
        FROM researches 
        WHERE uploader_id = ? 
        GROUP BY WEEK(publish_date) 
        ORDER BY WEEK(publish_date) ASC
      `, [userId]);
  
      res.json(results);
    } catch (error) {
      console.error('Error fetching weekly downloads:', error);
      res.status(500).send('Server error');
    }
  });
  
 
  // Route to get monthly downloads for an individual uploader
  router.get('/user/monthly/downloads', async (req, res) => {
    const userId = req.query.userId;
  
    if (!userId) {
      return res.status(400).send('User ID is required');
    }
  
    try {
      const [results] = await db.query(`
        SELECT MONTH(publish_date) AS month, SUM(downloadCount) AS downloads 
        FROM researches 
        WHERE uploader_id = ? 
        GROUP BY MONTH(publish_date) 
        ORDER BY MONTH(publish_date) ASC
      `, [userId]);
  
      res.json(results);
    } catch (error) {
      console.error('Error fetching monthly downloads:', error);
      res.status(500).send('Server error');
    }
  });
  
  // Route to get monthly citations for an individual uploader
  router.get('/user/daily/citations', async (req, res) => {
    const userId = req.query.userId;
  
    if (!userId) {
      return res.status(400).send('User ID is required');
    }
  
    try {
      const [results] = await db.query(`
        SELECT 
          DAYOFWEEK(publish_date) AS day_of_week, 
          SUM(citeCount) AS citations 
        FROM researches 
        WHERE uploader_id = ? 
        GROUP BY DAYOFWEEK(publish_date) 
        ORDER BY DAYOFWEEK(publish_date) ASC
      `, [userId]);
  
      // Format the results for better readability
      const daysMapping = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const formattedResults = results.map(row => ({
        day: daysMapping[row.day_of_week - 1], // DAYOFWEEK returns 1 (Sunday) to 7 (Saturday)
        citations: row.citations
      }));
  
      res.json(formattedResults);
    } catch (error) {
      console.error('Error fetching daily citations:', error);
      res.status(500).send('Server error');
    }
  });

   // Route to get weekly citations for an individual uploader
   router.get('/user/weekly/citations', async (req, res) => {
    const userId = req.query.userId;
  
    if (!userId) {
      return res.status(400).send('User ID is required');
    }
  
    try {
      const [results] = await db.query(`
        SELECT WEEK(publish_date) AS week, SUM(citeCount) AS citations 
        FROM researches 
        WHERE uploader_id = ? 
        GROUP BY WEEK(publish_date) 
        ORDER BY WEEK(publish_date) ASC
      `, [userId]);
  
      res.json(results);
    } catch (error) {
      console.error('Error fetching weekly citations:', error);
      res.status(500).send('Server error');
    }
  });

   // Route to get monthly citations for an individual uploader
router.get('/user/monthly/citations', async (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).send('User ID is required');
  }

  try {
    const [results] = await db.query(`
      SELECT 
        MONTH(publish_date) AS month, 
        YEAR(publish_date) AS year, 
        SUM(citeCount) AS citations 
      FROM researches 
      WHERE uploader_id = ? 
      GROUP BY year, month 
      ORDER BY year ASC, month ASC
    `, [userId]);

    // Format the results to return month names
    const monthsMapping = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const formattedResults = results.map(row => ({
      month: monthsMapping[row.month - 1],
      year: row.year,
      citations: row.citations
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error('Error fetching monthly citations:', error);
    res.status(500).send('Server error');
  }
});
  
  
  // New route for daily views
  router.get('/user/daily/views', async (req, res) => {
    const userId = req.query.userId;
  
    if (!userId) {
      return res.status(400).send('User ID is required');
    }
  
    try {
      const [results] = await db.query(`
        SELECT DAYOFWEEK(publish_date) AS day_of_week, SUM(viewCount) AS views
        FROM researches
        WHERE uploader_id = ?
        GROUP BY DAYOFWEEK(publish_date)
        ORDER BY DAYOFWEEK(publish_date) ASC
      `, [userId]);
  
      // Map the numeric day_of_week (1=Sunday, 7=Saturday) to day names (Sunday, Monday, etc.)
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const mappedResults = results.map(item => ({
        day: daysOfWeek[item.day_of_week - 1], // Adjust for Day of Week (1=Sunday, 7=Saturday)
        views: item.views
      }));
  
      res.json(mappedResults);
    } catch (error) {
      console.error('Error fetching daily views:', error);
      res.status(500).send('Server error');
    }
  });
  

 
  router.get('/user/weekly/views', async (req, res) => {
    const userId = req.query.userId;
  
    if (!userId) {
      return res.status(400).send('User ID is required');
    }
  
    try {
      const [results] = await db.query(`
        SELECT WEEK(publish_date) AS week, YEAR(publish_date) AS year, SUM(viewCount) AS views
        FROM researches
        WHERE uploader_id = ?
        GROUP BY WEEK(publish_date), YEAR(publish_date)
        ORDER BY YEAR(publish_date) ASC, WEEK(publish_date) ASC
      `, [userId]);
  
      res.json(results);
    } catch (error) {
      console.error('Error fetching weekly views:', error);
      res.status(500).send('Server error');
    }
  });
  router.get('/user/monthly/views', async (req, res) => {
    const userId = req.query.userId;
  
    if (!userId) {
      return res.status(400).send('User ID is required');
    }
  
    try {
      const [results] = await db.query(`
        SELECT MONTH(publish_date) AS month, YEAR(publish_date) AS year, SUM(viewCount) AS views
        FROM researches
        WHERE uploader_id = ?
        GROUP BY MONTH(publish_date), YEAR(publish_date)
        ORDER BY YEAR(publish_date) ASC, MONTH(publish_date) ASC
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



router.post('/research/view/:research_id', async (req, res) => {
    try {
        const researchId = req.params.research_id;

        // SQL query to increment the view count
        const incrementViewQuery = 'UPDATE researches SET viewCount = viewCount + 1 WHERE research_id = ?';
        const [result] = await db.query(incrementViewQuery, [researchId]);

        // Check if the research article was found and updated
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Research not found' });
        }

        res.status(200).json({ message: 'View count updated successfully' });
    } catch (error) {
        console.error('Error updating view count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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
