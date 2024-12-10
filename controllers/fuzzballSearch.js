const fuzzball = require('fuzzball');
const db = require('../database/db');

const fuzzballSearch = async (req, res) => {
    const { query } = req.body;

    // Record the start time
    const startTime = Date.now();

    try {
        // Fetch documents from the database
        const [results] = await db.query(`
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
        `);

        // Prepare data for fuzzball
        const documents = results.map(doc => ({
            id: doc.document_id,
            title: doc.title,
            author: doc.author,
            publish_date: doc.publish_date,
            abstract: doc.abstract,
            citation: doc.citation,
            category_name: doc.category_name,
            doctype_name: doc.doctype_name,
            department_name: doc.department_name,
            course_name: doc.course_name
        }));

        // Flatten the document data to a single string for fuzzball
        const documentStrings = documents.map(doc => 
            `${doc.title} ${doc.author} ${doc.abstract} ${doc.citation} ${doc.category_name} ${doc.doctype_name} ${doc.department_name} ${doc.course_name}`
        );

        // Perform the search
        const fuzzballResults = fuzzball.extract(query, documentStrings, { scorer: fuzzball.token_set_ratio, limit: 10 });

        // Format the results to include document metadata
        const formattedResults = fuzzballResults.map(([text, score]) => {
            const docIndex = documentStrings.indexOf(text);
            return { ...documents[docIndex], score };
        });

        // Sort the search results based on their score (similarity)
        formattedResults.sort((a, b) => b.score - a.score);

        // Record the end time
        const endTime = Date.now();

        // Calculate the execution time
        const executionTime = endTime - startTime;

        // Log or display the execution time
        console.log('Execution time:', executionTime, 'milliseconds');

        res.json({ results: formattedResults });
    } catch (error) {
        console.error('Error fetching documents or performing search: ', error);
        res.status(500).json({ error: 'Fetch Document Endpoint Error' });
    }
};

module.exports = { fuzzballSearch };
