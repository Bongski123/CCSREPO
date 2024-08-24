const EventEmitter = require("events");
EventEmitter.defaultMaxListeners = 20;
const fs = require('fs');
const path = require('path');
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./database/db");
const {
  authenticateToken,
  isAdmin,
  isNCFUser,
  isNotNCFUser,
} = require("./authentication/middleware");
// User Management
const roleRoutes = require("./routes/roleRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
// Algorithm
const searchRoutes = require("./routes/searchRoutes");
// CRUD Documents
const documentRoutes = require("./routes/documentRoutes");
const adminRoutes = require("./routes/adminRoutes");
// Browse Filter
const filterRoutes = require("./routes/filterRoutes");
// Dashboard
const dashboardRoutes = require("./routes/dashboardRoutes");
require("dotenv").config();

const categoriesRoutes = require("./routes/categories");
const pdfRoutes = require('./routes/pdfRoutes'); // Adjust the path as necessary

const keywordsRoutes = require("./routes/keywords");





const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 10062;

// Algorithm
app.use("/search", searchRoutes);

// User Management
app.use(roleRoutes);
app.use(userRoutes);
app.use(authRoutes);


// CRUD Documents
app.use(documentRoutes);
app.use(adminRoutes);

// Browse Filter
app.use(filterRoutes);

// Dashboard such as Citations Adding
app.use(dashboardRoutes);


app.use(categoriesRoutes);

app.use(keywordsRoutes);

app.use('/pdf', pdfRoutes);

app.use(express.static(path.join(__dirname, 'public')));



// Serve static files from the public directory
app.use(express.static(path.join(__dirname, './public')));

// API to fetch PDF file by research ID
app.get('/pdf/:research_id', (req, res) => {
    const researchID = req.params.research_id;

    // Retrieve file name from the database based on research ID
    db.query('SELECT filename FROM researches WHERE research_id = ?', [researchID], (err, result) => {
        if (err) {
            console.error('Error retrieving file name:', err);
            return res.status(500).send('Internal Server Error');
        }
        
        if (result.length > 0) {
            const fileName = result[0].file_name;
            const filePath = path.join(__dirname, '../public/pdfs', fileName);
            
            // Check if the file exists
            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error('Error accessing file:', err);
                    return res.status(404).send('File not found');
                }
                
                // Serve the PDF file
                res.sendFile(filePath);
            });
        } else {
            res.status(404).send('File not found');
        }
    });
});


app.get("/", (req, res) => {
  res.json({ Messsage: "NCF Repository Backend Running!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
