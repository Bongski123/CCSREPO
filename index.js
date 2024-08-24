const EventEmitter = require("events");
EventEmitter.defaultMaxListeners = 20;

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






app.use('/pdfs', express.static(path.join(__dirname, 'public')));

// Define routes
app.get('/pdf/:researchId', (req, res) => {
  const { researchId } = req.params;
  const filePath = path.join(__dirname, 'pdfs', `${researchId}.pdf`);

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
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
