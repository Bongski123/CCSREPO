const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../database/db");
const {
  authenticateToken,
  isAdmin,
  isNCFUser,
  isNotNCFUser,
} = require("../authentication/middleware");

const router = express.Router();

// Approve the research
router.patch('/research/approve/:research_id', async (req, res) => {
    try {
        const researchId = req.params.research_id;
        
        const updateStatusQuery = 'UPDATE researches SET status = ? WHERE research_id = ?';
        const [result] = await db.query(updateStatusQuery, ['approved', researchId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Research not found' });
        }

        res.status(200).json({ message: 'Research approved successfully' });
    } catch (error) {
        console.error('Error approving research:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Reject the research
router.patch('/research/reject/:research_id', async (req, res) => {
    try {
        const researchId = req.params.research_id;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        // Query to get the user_id associated with the research
        const getUserIdQuery = 'SELECT uploader_id FROM researches WHERE research_id = ?';
        console.log('Get User ID Query:', getUserIdQuery, [researchId]);
        const [researchResult] = await db.query(getUserIdQuery, [researchId]);

        if (researchResult.length === 0) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const userId = researchResult[0].uploader_id;

        // Update the research status
        const updateStatusQuery = 'UPDATE researches SET status = ? WHERE research_id = ?';
        await db.query(updateStatusQuery, ['rejected', researchId]);

        // Insert notification for the user
        const notificationMessage = `Your research has been rejected. Reason: ${reason}`;
        const insertNotificationQuery = 'INSERT INTO notifications (user_id, message, created_at) VALUES (?, ?, NOW())';
        console.log('Insert Notification Query:', insertNotificationQuery, [userId, notificationMessage]);

        await db.query(insertNotificationQuery, [userId, notificationMessage]);

        res.status(200).json({ message: 'Research rejected successfully and notification sent' });
    } catch (error) {
        console.error('Error rejecting research:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




// View the research
router.get('/research/:research_id', async (req, res) => {
  try {
    const researchId = req.params.research_id;

    // SQL query to retrieve research details along with concatenated authors, keywords, and categories
    const getResearchQuery = `
      SELECT 
          r.*,  
          GROUP_CONCAT(DISTINCT a.author_name SEPARATOR ', ') AS authors,  
          GROUP_CONCAT(DISTINCT IFNULL(a.email, 'No email provided') SEPARATOR ', ') AS author_emails,
          GROUP_CONCAT(DISTINCT k.keyword_name SEPARATOR ', ') AS keywords,  
          GROUP_CONCAT(DISTINCT c.category_name SEPARATOR ', ') AS categories
      FROM 
          researches r
      LEFT JOIN 
          research_authors ra ON r.research_id = ra.research_id
      LEFT JOIN 
          authors a ON ra.author_id = a.author_id
      LEFT JOIN 
          research_keywords rk ON r.research_id = rk.research_id  
      LEFT JOIN 
          keywords k ON rk.keyword_id = k.keyword_id 
      LEFT JOIN 
          research_categories rc ON r.research_id = rc.research_id
      LEFT JOIN 
          category c ON rc.category_id = c.category_id 
      WHERE 
          r.research_id = ? 
      GROUP BY 
          r.research_id;
    `;

    const [rows] = await db.query(getResearchQuery, [researchId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Research not found' });
    }

    // Constructing the research object with concatenated fields
    const research = {
      research_id: rows[0].research_id,
      title: rows[0].title,
      publish_date: rows[0].publish_date,
      abstract: rows[0].abstract,
      status: rows[0].status || 'Not specified',
      authors: rows[0].authors || 'No authors available',
      author_emails: rows[0].author_emails || 'No emails available',
      keywords: rows[0].keywords || 'No keywords available',
      categories: rows[0].categories || 'No categories available'
    };

    res.status(200).json({ research });
  } catch (error) {
    console.error('Error viewing research:', error.message || error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




// View all researches
router.get("/researches", async (req, res) => {
  try {
    const [researches] = await db.query(`SELECT r.research_id, r.title, r.publish_date, r.abstract, r.filename, r.status, 
             r.viewCount, r.downloadCount, r.citeCount,
             GROUP_CONCAT(a.author_name) AS authors,
              GROUP_CONCAT(a.email) AS authors_emails
      FROM researches r
      LEFT JOIN research_authors ra ON r.research_id = ra.research_id
      LEFT JOIN authors a ON ra.author_id = a.author_id
      GROUP BY r.research_id`);
    res.status(200).json(researches);
  } catch (error) {
    console.error("Error getting researches:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting researches" });
  }
}); 



router.get("/researches/rejected", async (req, res) => {
  try {
    const { notificationId } = req.query; // Optionally filter by notificationId

    let query = `
      SELECT 
        r.research_id, 
        r.title, 
        r.publish_date, 
        r.abstract, 
        r.filename, 
        r.status, 
        n.message AS rejection_reason,
        GROUP_CONCAT(a.author_name) AS authors
      FROM researches r
      LEFT JOIN research_authors ra ON r.research_id = ra.research_id
      LEFT JOIN authors a ON ra.author_id = a.author_id
      LEFT JOIN notifications n ON n.research_id = r.research_id
      WHERE r.status = 'Rejected'`;

    if (notificationId) {
      query += ` AND n.notification_id = ?`;
    }

    query += ` GROUP BY r.research_id`;

    const [researches] = notificationId
      ? await db.query(query, [notificationId])
      : await db.query(query);

    res.status(200).json(researches);
  } catch (error) {
    console.error("Error getting rejected researches:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting rejected researches" });
  }
});

// Route to get total downloads
// Route to get total downloads
router.get('/total/downloads', async (req, res) => {
    try {
      let sql = 'SELECT SUM(downloadCount) AS total_downloads FROM researches';
      const [result] = await db.query(sql);
      res.json(result[0]);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  router.get('/user/research/:researchId/downloads', async (req, res) => {
    const { researchId } = req.params; // Get the researchId from the request parameters
    try {
      const sql = 'SELECT SUM(downloadCount) AS total_downloads FROM researches WHERE research_id = ?'; // Change researchId if needed
      const [result] = await db.query(sql, [researchId]); // Pass the researchId as a parameter
      
      if (result.length === 0) {
        return res.status(404).send('Research not found.');
      }
      
      res.json(result[0]); // Send the total downloads for the research
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  
 // Route to get total citations
router.get('/total/citations', async (req, res) => {
    try {
      let sql = 'SELECT SUM(citeCount) AS total_citations FROM researches';
      const [result] = await db.query(sql);
      res.json(result[0]);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  // Route to get total researches
router.get('/total/researches', async (req, res) => {
  try {
    let sql = 'SELECT COUNT(*) AS total_researches FROM researches';
    const [result] = await db.query(sql);
    res.json(result[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

  
  // Route to get total users
  router.get('/all/users', async (req, res) => {
    try {
      let sql = 'SELECT COUNT(*) AS total_users FROM users';
      const [result] = await db.query(sql);
      res.json(result[0]);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  

// Increment download count
router.post('/research/download/:research_id',  async (req, res) => {
    try {
        const researchId = req.params.research_id;

        const incrementDownloadQuery = 'UPDATE researches SET downloadCount = downloadCount + 1 WHERE research_id = ?';
        const [result] = await db.query(incrementDownloadQuery, [researchId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Research not found' });
        }

        res.status(200).json({ message: 'Download count updated successfully' });
    } catch (error) {
        console.error('Error updating download count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Increment citation count
router.post('/research/cite/:research_id',  async (req, res) => {
    try {
        const researchId = req.params.research_id;

        const incrementCiteQuery = 'UPDATE researches SET citeCount = citeCount + 1 WHERE research_id = ?';
        const [result] = await db.query(incrementCiteQuery, [researchId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Research not found' });
        }

        res.status(200).json({ message: 'Citation count updated successfully' });
    } catch (error) {
        console.error('Error updating citation count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/daily/downloads', async (req, res) => {
    try {
      const [results] = await db.query('SELECT DATE(publish_date) AS date, SUM(downloadCount) AS downloads FROM researches GROUP BY DATE(publish_date) ORDER BY DATE(publish_date) ASC');
      res.json(results);
    } catch (error) {
      console.error('Error fetching daily downloads:', error);
      res.status(500).send('Server error');
    }
  });
  
  router.get('/daily/citations', async (req, res) => {
    try {
      // Adjust the query based on how you store citations in your database
      const [results] = await db.query(
        'SELECT DATE(publish_date) AS date, SUM(citeCount) AS citations FROM researches GROUP BY DATE(publish_date) ORDER BY DATE(publish_date) ASC'
      );
      res.json(results);
    } catch (error) {
      console.error('Error fetching daily citations:', error);
      res.status(500).send('Server error');
    }
  });
  


  router.get('/admin/uploader-stats-by-role', async (req, res) => {
    try {
      const results = await db.query(`
        SELECT role.role_name, COUNT(research.research_id) AS uploads
        FROM users u
        JOIN roles role ON u.role_id = role.role_id
        LEFT JOIN researches research ON u.user_id = research.uploader_id
        GROUP BY role.role_name;
      `);
  
      res.json(results);
    } catch (error) {
      console.error('Error fetching daily citations:', error);
      res.status(500).send('Server error');
    }
  });
  
  
module.exports = router;
