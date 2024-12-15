const EventEmitter = require("events");


EventEmitter.defaultMaxListeners = 20;
const fs = require('fs');
const path = require('path');
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./database/db");
const dotenv = require('dotenv');
require('dotenv').config();




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
const authorRoutes = require("./routes/Content Filtering/browseRoutes")

const categoriesRoutes = require("./routes/categories");
const pdfRoutes = require('./routes/pdfFILES'); // Adjust the path as necessary

const keywordsRoutes = require("./routes/keywords");
const pdfrequestretrieval = require("./routes/Pdf-request-retrieval");

const Notification = require("./routes/UserDash");
const pdfRequestRoutes = require("./routes/RequestPDFRoutes");
const InstitutionRoutes =require("./routes/InstitutionRoutes");
//google login

const googleRoutes=require("./routes/googleLogin");
const EmailVerification=require("./routes/EmailVerification");

const privacyRoutes = require('./routes/FilePrivacy'); // Path to the file with the above route

//reset password

const PasswordReset = require("./routes/PasswordReset");

//updatefiles

const Updatefiles=require("./routes/filesupdate");
//send paper
const SendPaper=require("./routes/SendPaper");
const app = express();
app.use(bodyParser.json());
app.use(cors());


const PORT = process.env.PORT || 10121;

// Algorithm
app.use("/search", searchRoutes);

// User Management
app.use(roleRoutes);
app.use(userRoutes);
app.use(authRoutes);
app.use(PasswordReset);

// CRUD Documents
app.use(documentRoutes);
app.use(adminRoutes);
app.use(Updatefiles);
app.use(privacyRoutes);
app.use(SendPaper);
app.use(EmailVerification);


// Browse Filter
app.use(filterRoutes);
app.use(authorRoutes);
app.use(pdfrequestretrieval);

// Dashboard such as Citations Adding
app.use(dashboardRoutes);
app.use(Notification);


app.use(categoriesRoutes);

app.use(keywordsRoutes);
app.use(InstitutionRoutes);
app.use(pdfRequestRoutes);
app.use(pdfRoutes);

//googlef

app.use(googleRoutes);

app.use(express.static(path.join(__dirname, '../../uploads')));


app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});





app.get("/", (req, res) => {
  res.json({ Messsage: "NCF Repository Backend Running!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
