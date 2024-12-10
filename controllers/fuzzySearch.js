const db = require('../database/db');

// Function to calculate the Levenshtein distance between two strings
function levenshteinDistance(a, b) {
  const distanceMatrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i += 1) {
    distanceMatrix[0][i] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    distanceMatrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      distanceMatrix[j][i] = Math.min(
        distanceMatrix[j][i - 1] + 1, // deletion
        distanceMatrix[j - 1][i] + 1, // insertion
        distanceMatrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  return distanceMatrix[b.length][a.length];
}

const fuzzySearch = (req, res) => {
  const { query } = req.body;

  db.query(`SELECT 
    r.research_id, 
    r.title, 
    r.publish_date, 
    r.abstract, 
    r.filename,
    c.category_name AS category,  -- Include the category name from the categories table
    COALESCE(GROUP_CONCAT(DISTINCT a.author_name ORDER BY a.author_name ASC SEPARATOR ', '), 'No authors') AS authors, 
    COALESCE(GROUP_CONCAT(DISTINCT k.keyword_name ORDER BY k.keyword_name ASC SEPARATOR ', '), 'No keywords') AS keywords 
FROM 
    researches r
    LEFT JOIN research_authors ra ON r.research_id = ra.research_id
    LEFT JOIN authors a ON ra.author_id = a.author_id
    LEFT JOIN research_keywords rk ON r.research_id = rk.research_id
    LEFT JOIN keywords k ON rk.keyword_id = k.keyword_id
    LEFT JOIN research_categories rc ON r.research_id = rc.research_id  -- Join with the junction table
    LEFT JOIN category c ON rc.category_id = c.category_id  -- Join with categories table through junction table
WHERE 
    r.status = 'approved'
GROUP BY 
    r.research_id, r.title, r.publish_date, r.abstract, r.filename, c.category_name
LIMIT 0, 1000;`, (error, results) => {
    if (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    // Perform manual fuzzy search
    const searchResult = results.map((research) => {
      const titleDistance = levenshteinDistance(query, research.title);
      const authorNameDistance = levenshteinDistance(query, research.author_name);
      const keywordNameDistance = levenshteinDistance(query, research.keyword_name);
      const abstractDistance = levenshteinDistance(query, research.abstract);
      const totalDistance = titleDistance + authorNameDistance + keywordNameDistance + abstractDistance;

      return {
        ...research,
        relevance: totalDistance,
      };
    });

    // Sort search results by relevance
    searchResult.sort((a, b) => a.relevance - b.relevance);

    res.json(searchResult);
  });
};

module.exports = {fuzzySearch};
