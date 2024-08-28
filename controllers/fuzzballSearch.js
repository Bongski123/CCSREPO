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
                d.document_id,
                d.title,
                d.author,
                d.publish_date,
                d.abstract,
                d.citation,
                c.category_name,
                dt.doctype_name,
                dep.department_name,
                co.course_name 
            FROM 
                document d 
            JOIN 
                category c ON d.category_id = c.category_id 
            JOIN 
                doctype dt ON d.doctype_id = dt.doctype_id 
            JOIN 
                department dep ON d.department_id = dep.department_id 
            JOIN 
                course co ON d.course_id = co.course_id
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
