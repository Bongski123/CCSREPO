const db = require('../database/db');
const Fuse = require('fuse.js');

const fuseSearch = async (req, res) => {
    const { query } = req.body;

    try {
        // Fetch documents from the database with necessary joins
        const fetchDocumentsQuery = `
           SELECT 
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
LIMIT 0, 1000;
`;

        const [results] = await db.query(fetchDocumentsQuery);

        // Prepare data for Fuse.js
        const options = {
            keys: ['title', 'authors', 'abstract', 'keywords','category'], // Fields to search in documents
            threshold: 0.6, // Adjust the threshold according to your needs
            ignoreCase: true // Make the search case-insensitive
        };
        const fuse = new Fuse(results, options);

        // Perform the search
        const searchResults = fuse.search(query).map(result => result.item);

        res.json({ results: searchResults });
    } catch (error) {
        console.error('Error fetching documents or performing search: ', error);
        res.status(500).json({ error: 'Fetch Document Endpoint Error' });
    }
};

module.exports = { fuseSearch };
