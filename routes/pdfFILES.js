const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../database/db'); // Adjust the path as necessary
const FTPClient = require('basic-ftp'); // FTPS Client to handle FTPS file download

const router = express.Router();

// FTPS Configuration
const ftpsConfig = {
    host: "c011ftp.cloudclusters.net", // Replace with your FTPS host
    user: "admin",                     // Replace with your FTPS username
    password: "hCmGOATIy6NL",          // Replace with your FTPS password
    secure: true,                      // Enable secure connection
};

// Function to Download File from FTPS Server
async function downloadFromFTPS(remotePath, localPath) {
    const client = new FTPClient.Client();
    client.ftp.timeout = 30000;  // Set timeout for FTPS connections

    try {
        await client.access(ftpsConfig);  // Connect to FTPS server
        console.log(`Connected to FTPS server: ${ftpsConfig.host}`);
        
        // Download the file to the local path
        await client.downloadTo(localPath, remotePath);
        console.log(`File downloaded to: ${localPath}`);
    } catch (err) {
        console.error('FTPS download failed:', err);
        throw err;  // Throw error if download fails
    } finally {
        client.close();
    }
}

// API to fetch PDF file by research ID
router.get('/pdf/:research_id', async (req, res) => {
    const researchID = req.params.research_id;

    try {
        // Retrieve file name from the database based on research ID
        const [result] = await db.query('SELECT filename FROM researches WHERE research_id = ?', [researchID]);
        
        if (result.length > 0) {
            const fileName = result[0].filename; // Ensure this matches your database field name
            const remoteFilePath = `/uploads/documents/${fileName}`;  // Path on FTPS server
            const localTempPath = path.resolve(__dirname, './temp', fileName);  // Local temporary path for the file

            console.log('Remote file path:', remoteFilePath);
            console.log('Local temp file path:', localTempPath);

            // Download the file from FTPS server
            await downloadFromFTPS(remoteFilePath, localTempPath);

            // Serve the downloaded PDF file
            res.sendFile(localTempPath, (err) => {
                if (err) {
                    console.error('Error serving file:', err);
                    res.status(500).send('Error serving the file');
                } else {
                    // Optionally delete the temporary file after serving it
                    fs.unlink(localTempPath, (err) => {
                        if (err) {
                            console.error('Error deleting temporary file:', err);
                        }
                    });
                }
            });
        } else {
            res.status(404).send('File not found');
        }
    } catch (err) {
        console.error('Error retrieving file:', err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
