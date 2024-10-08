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
                GROUP_CONCAT(DISTINCT a.author_name) AS authors, 
                GROUP_CONCAT(DISTINCT k.keyword_name) AS keywords 
            FROM 
                researches r 
                LEFT JOIN research_authors ra ON r.research_id = ra.research_id 
                LEFT JOIN authors a ON ra.author_id = a.author_id 
                LEFT JOIN research_keywords rk ON r.research_id = rk.research_id 
                LEFT JOIN keywords k ON rk.keyword_id = k.keyword_id 
            WHERE 
                r.status = 'approved'
            GROUP BY 
                r.research_id, r.title, r.publish_date, r.abstract, r.filename`;

        const [results] = await db.query(fetchDocumentsQuery);

        // Prepare data for Fuse.js
        const options = {
            keys: ['title', 'authors', 'abstract', 'keywords'], // Fields to search in documents
            threshold: 0.4, // Adjust the threshold according to your needs
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
