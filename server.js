const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const port = 4000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using https
}));

// MySQL Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mentorship_platform',
    port: 3306,
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

// Routes for static pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/about.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/contact.html'));
});

app.get('/services', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/services.html'));
});

app.get('/members', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/members.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/register.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/contact.html'));
});

// Set up email transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.mail.yahoo.com',
    port: 465,
    secure: true,
    auth: {
        user: 'geffkenne@yahoo.ca',         // Your Yahoo email
        pass: 'afekmtvhjgznageu'       // Your Yahoo app-specific password
    }
});

// Route to handle contact form submission
app.post('/send_email', (req, res) => {
    const { firstName, lastName, email, phone, details } = req.body;

    const mailOptions = {
        from: 'geffkenne@yahoo.ca',        // Must match the Yahoo account used for SMTP auth
        to: 'dana3pal@gmail.com',            // Admin email address
        subject: `Contact Form Submission from ${firstName} ${lastName}`,
        text: `
            First Name: ${firstName}
            Last Name: ${lastName}
            Email: ${email}
            Phone: ${phone}
            Details: ${details}
        `
    };

    // Send email only to the admin
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email to admin:', error);
            res.status(500).json({ success: false, message: 'Error sending email.' });
        } else {
            console.log('Email sent to admin:', info.response);
            res.status(200).json({ success: true, message: 'Message sent to admin successfully!' });
        }
    });
});


//Handle register users
app.post('/register', (req, res) => {
    const { name, email, password, userType, expertise } = req.body;

    // Insert user based on type
    const query = userType === "mentor"
        ? `INSERT INTO Users (name, email, password, userType, expertise) VALUES (?, ?, ?, 'mentor', ?)`
        : `INSERT INTO Users (name, email, password, userType) VALUES (?, ?, ?, 'mentoree')`;

    const params = userType === "mentor" ? [name, email, password, expertise] : [name, email, password];

    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Error registering user:", err);
            return res.json({ success: false, message: 'Error: Could not create account.' });
        }
        res.json({ success: true, message: 'Account created successfully! Please log in.' });
    });
});


// Handle login
app.post('/login', (req, res) => {
    const { email, password, userType } = req.body;

    const query = `SELECT * FROM Users WHERE email = ? AND userType = ?`;

    db.query(query, [email, userType], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.json({ success: false, message: 'User not found.' });
        }

        const user = results[0];

        if (password === user.password) {
            req.session.user = {
                userID: user.userID,
                name: user.name,
                email: user.email,
                userType: user.userType
            };
            return res.json({ success: true, message: 'Login successful!' });
        } else {
            return res.json({ success: false, message: 'Incorrect password.' });
        }
    });
});

// Dashboard route (requires user to be logged in)
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/members');
    }
    res.sendFile(path.join(__dirname, 'public/dashboard/dashboard.html'));
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.redirect('/dashboard');
        }
        res.redirect('/');
    });
});

// Endpoint to send a new message
app.post('/send-message', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'User not logged in.' });
    }

    const { receiverEmail, subject, messageBody } = req.body;
    const senderID = req.session.user.userID;

    const findReceiverQuery = 'SELECT userID FROM Users WHERE email = ?';

    db.query(findReceiverQuery, [receiverEmail], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.json({ success: false, message: 'Receiver not found.' });
        }

        const receiverID = results[0].userID;

        // Insert the message with initial status set to 'sent'
        const insertMessageQuery = `
            INSERT INTO Communications (senderID, receiverID, subject, body, status)
            VALUES (?, ?, ?, ?, 'sent')
        `;

        db.query(insertMessageQuery, [senderID, receiverID, subject, messageBody], (err, result) => {
            if (err) throw err;
            res.json({ success: true, message: 'Message sent successfully.' });
        });
    });
});


// Retrieve received messages for the logged-in user
app.get('/inbox/received', (req, res) => {
    // Check if the user is logged in
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'User not logged in.' });
    }

    const userID = req.session.user.userID; // Get the logged-in user's ID from session

    const getMessagesQuery = `
        SELECT c.communicationID, u.name AS senderName, u.email AS senderEmail, c.subject, c.body, c.dateSent
        FROM Communications c
        JOIN Users u ON c.senderID = u.userID
        WHERE c.receiverID = ?
        ORDER BY c.dateSent DESC
    `;

    db.query(getMessagesQuery, [userID], (err, results) => {
        if (err) throw err;
        res.json({ success: true, messages: results });
    });
});

// Retrieve sent messages for the logged-in user
app.get('/inbox/sent', (req, res) => {
    // Check if the user is logged in
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'User not logged in.' });
    }

    const userID = req.session.user.userID; // Get the logged-in user's ID from session

    const getSentMessagesQuery = `
        SELECT c.communicationID, u.name AS receiverName, c.subject, c.body, c.dateSent
        FROM Communications c
        JOIN Users u ON c.receiverID = u.userID
        WHERE c.senderID = ?
        ORDER BY c.dateSent DESC
    `;

    db.query(getSentMessagesQuery, [userID], (err, results) => {
        if (err) throw err;
        res.json({ success: true, messages: results });
    });
});

// View message by communicationID
app.get('/view-message/:communicationID', (req, res) => {
    const communicationID = req.params.communicationID;

    const getMessageQuery = `
        SELECT c.subject, c.body, c.status
        FROM Communications c
        WHERE c.communicationID = ?
    `;

    db.query(getMessageQuery, [communicationID], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.json({ success: false, message: 'Message not found.' });
        }

        res.json({ success: true, message: results[0] });
    });
});

// Mark message as read
app.post('/mark-as-read/:communicationID', (req, res) => {
    const communicationID = req.params.communicationID;

    const markAsReadQuery = `UPDATE Communications SET status = 'read' WHERE communicationID = ? AND status = 'sent'`;

    db.query(markAsReadQuery, [communicationID], (err, result) => {
        if (err) throw err;
        res.json({ success: true, message: 'Message marked as read.' });
    });
});

// // Delete a message by communicationID
// app.delete('/delete-message/:communicationID', (req, res) => {
//     const communicationID = req.params.communicationID;
//
//     const deleteQuery = 'DELETE FROM Communications WHERE communicationID = ?';
//
//     db.query(deleteQuery, [communicationID], (err, result) => {
//         if (err) throw err;
//
//         if (result.affectedRows > 0) {
//             res.json({ success: true, message: 'Message deleted successfully.' });
//         } else {
//             res.json({ success: false, message: 'Message not found.' });
//         }
//     });
// });

// Route to fetch contacts
app.get('/contacts', (req, res) => {
    const userID = req.session.user.userID; // Logged-in user's ID
    const query = `
        SELECT u.userID, u.name, u.email, u.userType, u.expertise
        FROM Contacts c
        JOIN Users u ON (c.userID1 = u.userID OR c.userID2 = u.userID)
        WHERE (c.userID1 = ? OR c.userID2 = ?) AND u.userID != ? AND c.status = 'accepted'
    `;
    db.query(query, [userID, userID, userID], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching contacts.' });
        res.json({ success: true, contacts: results });
    });
});

// Search route
app.post('/search', (req, res) => {
    const { searchTerm } = req.body;
    const loggedInUserId = req.session.user.userID;  // Get logged-in user ID

    const query = `
        SELECT userID, name, email, userType, expertise 
        FROM Users 
        WHERE (name LIKE ? OR expertise LIKE ?)
        AND userID != ?  -- Exclude logged-in user
    `;

    const formattedSearchTerm = `%${searchTerm}%`;

    db.query(query, [formattedSearchTerm, formattedSearchTerm, loggedInUserId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error performing search.' });
        }
        res.json({ success: true, results });
    });
});


// Mentorship request route
app.post('/request-mentorship', (req, res) => {
    const { userID } = req.body;
    const mentoreeID = req.session.user.userID; // assuming user is logged in as mentoree
    const query = `
        INSERT INTO Request (mentorID, mentoreeID, status) VALUES (?, ?, 'pending')
    `;
    db.query(query, [userID, mentoreeID], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Failed to send mentorship request.' });
        }
        res.json({ success: true, message: 'Mentorship request sent!' });
    });
});

// Friend request route
app.post('/add-friend', (req, res) => {
    const { userID } = req.body;
    const userID1 = req.session.user.userID; // assuming logged-in user
    const query = `
        INSERT INTO Contacts (userID1, userID2, status) VALUES (?, ?, 'pending')
    `;
    db.query(query, [userID1, userID], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Failed to send friend request.' });
        }
        res.json({ success: true, message: 'Friend request sent!' });
    });
});

// Send message route
// app.post('/send-message', (req, res) => {
//     const { receiverEmail, subject, messageBody } = req.body;
//     const senderID = req.session.user.userID;
//
//     db.query('SELECT userID FROM Users WHERE email = ?', [receiverEmail], (err, results) => {
//         if (err) {
//             console.error(err);
//             return res.status(500).json({ success: false, message: 'Error finding receiver.' });
//         }
//         if (results.length === 0) {
//             return res.status(404).json({ success: false, message: 'Receiver not found.' });
//         }
//
//         const receiverID = results[0].userID;
//         const insertQuery = `
//             INSERT INTO Communications (senderID, receiverID, subject, body, status) VALUES (?, ?, ?, ?, 'sent')
//         `;
//
//         db.query(insertQuery, [senderID, receiverID, subject, messageBody], (err) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).json({ success: false, message: 'Failed to send message.' });
//             }
//             res.json({ success: true, message: 'Message sent successfully!' });
//         });
//     });
// });


// Fetch user data for the welcome message
app.get('/user-data', (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.json({ success: false, message: 'User not logged in' });
    }
});

// Fetch pending mentorship requests
app.get('/dashboard/requests', (req, res) => {
    const userID = req.session.user.userID;
    const userType = req.session.user.userType;

    let query;
    if (userType === 'mentor') {
        query = `SELECT r.requestID, u.name AS mentoreeName, 'mentoree' AS userType 
                 FROM Request r JOIN Users u ON r.mentoreeID = u.userID 
                 WHERE r.mentorID = ? AND r.status = 'pending'`;
    } else {
        query = `SELECT r.requestID, u.name AS mentorName, 'mentor' AS userType 
                 FROM Request r JOIN Users u ON r.mentorID = u.userID 
                 WHERE r.mentoreeID = ? AND r.status = 'pending'`;
    }

    db.query(query, [userID], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, requests: results });
    });
});

// Respond to mentorship request
app.post('/dashboard/respond-request/:requestID', (req, res) => {
    const requestID = req.params.requestID;
    const { status } = req.body;

    const query = `UPDATE Request SET status = ? WHERE requestID = ?`;
    db.query(query, [status, requestID], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true });
    });
});

// Fetch pending friend requests
app.get('/dashboard/friend-requests', (req, res) => {
    const userID = req.session.user.userID;

    const query = `SELECT c.contactID, u.name AS userName 
                   FROM Contacts c JOIN Users u ON (c.userID1 = u.userID OR c.userID2 = u.userID)
                   WHERE (c.userID1 = ? OR c.userID2 = ?) AND c.status = 'pending' AND u.userID != ?`;

    db.query(query, [userID, userID, userID], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, friendRequests: results });
    });
});

// Respond to friend request
app.post('/dashboard/respond-friend-request/:contactID', (req, res) => {
    const contactID = req.params.contactID;
    const { status } = req.body;

    const query = `UPDATE Contacts SET status = ? WHERE contactID = ?`;
    db.query(query, [status, contactID], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true });
    });
});


// Send message route
app.post('/send-message', (req, res) => {
    const { receiverEmail, subject, messageBody } = req.body;
    const senderID = req.session.user.userID;

    const findReceiverQuery = `SELECT userID FROM Users WHERE email = ?`;
    db.query(findReceiverQuery, [receiverEmail], (err, results) => {
        if (err || results.length === 0) {
            return res.json({ success: false, message: 'Receiver not found.' });
        }

        const receiverID = results[0].userID;
        const insertMessageQuery = `
            INSERT INTO Communications (senderID, receiverID, subject, body, status)
            VALUES (?, ?, ?, ?, 'sent')
        `;
        db.query(insertMessageQuery, [senderID, receiverID, subject, messageBody], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Error sending message.' });
            res.json({ success: true, message: 'Message sent successfully!' });
        });
    });
});

// Add friend route
app.post('/add-friend', (req, res) => {
    const userID = req.session.user.userID;
    const friendID = req.body.userID;

    const insertFriendQuery = `
        INSERT INTO Contacts (userID1, userID2, status) VALUES (?, ?, 'pending')
    `;
    db.query(insertFriendQuery, [userID, friendID], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Error adding friend.' });
        res.json({ success: true, message: 'Friend request sent!' });
    });
});

// Request mentorship route
app.post('/request-mentorship', (req, res) => {
    const mentoreeID = req.session.user.userID;
    const mentorID = req.body.userID;

    const insertRequestQuery = `
        INSERT INTO Request (mentorID, mentoreeID, status) VALUES (?, ?, 'pending')
    `;
    db.query(insertRequestQuery, [mentorID, mentoreeID], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Error sending mentorship request.' });
        res.json({ success: true, message: 'Mentorship request sent!' });
    });
});



// Fetch tasks
app.get('/tasks', (req, res) => {
    const userID = req.session.user.userID;
    const query = 'SELECT * FROM Tasks WHERE userID = ? ORDER BY start ASC';
    db.query(query, [userID], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Add new task
app.post('/tasks', (req, res) => {
    const { title, start } = req.body;
    const userID = req.session.user.userID;
    const query = 'INSERT INTO Tasks (userID, title, start) VALUES (?, ?, ?)';
    db.query(query, [userID, title, start], (err, result) => {
        if (err) throw err;
        res.json({ success: true, taskID: result.insertId });
    });
});

// Delete task
app.delete('/tasks/:id', (req, res) => {
    const taskID = req.params.id;
    const userID = req.session.user.userID;
    const query = 'DELETE FROM Tasks WHERE taskID = ? AND userID = ?';
    db.query(query, [taskID, userID], (err, result) => {
        if (err) throw err;
        res.json({ success: result.affectedRows > 0 });
    });
});


//On the server-side (server.js), add an endpoint to handle the settings update:
app.post('/update-settings', (req, res) => {
    const { name, email, password, expertise } = req.body;
    const userID = req.session.user.userID; // Assume user is logged in

    let query = `UPDATE Users SET name = ?, email = ?`;
    const params = [name, email, userID];

    if (password) {
        query += `, password = ?`;
        params.splice(2, 0, password); // Insert password into query
    }
    if (req.session.user.userType === 'mentor' && expertise !== null) {
        query += `, expertise = ?`;
        params.splice(3, 0, expertise); // Insert expertise if mentor
    }

    query += ` WHERE userID = ?`;

    db.query(query, params, (err) => {
        if (err) {
            console.error('Error updating settings:', err);
            res.json({ success: false });
        } else {
            res.json({ success: true });
        }
    });
});



// Route to send verification code
app.post('/send-verification-code', (req, res) => {
    const { email } = req.body;

    // Verify email exists in database
    const findEmailQuery = 'SELECT email FROM Users WHERE email = ?';
    db.query(findEmailQuery, [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error.' });

        if (results.length === 0) {
            return res.json({ success: false, message: 'Email not found.' });
        }

        // Generate and store 4-digit code
        verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

        verifiedEmail = email;

        const mailOptions = {
            from: 'geffkenne@yahoo.ca',
            to: email,
            subject: 'Your Verification Code',
            text: `Your 4-digit verification code is: ${verificationCode}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ success: false, message: 'Failed to send email.' });
            }
            res.json({ success: true, message: 'Verification code sent to email.' });
        });
    });
});

// Route to verify code
app.post('/verify-code', (req, res) => {
    const { code } = req.body;

    if (code === verificationCode) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Endpoint to reset password
app.post('/reset-password', (req, res) => {
    const { email, verificationCode, newPassword } = req.body;

    // Check if the verification code is correct
    const queryCheckCode = `
        SELECT * FROM Users 
        WHERE email = ? AND verification_code = ? AND verification_expiry > NOW()
    `;

    db.query(queryCheckCode, [email, verificationCode], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error verifying the code.' });
        }

        // If code is valid, update the password
        if (results.length > 0) {
            // Hash the new password (make sure bcrypt is installed and required at the top)
            const hashedPassword = bcrypt.hashSync(newPassword, 10);

            const updatePasswordQuery = `UPDATE Users SET password = ?, verification_code = NULL WHERE email = ?`;
            db.query(updatePasswordQuery, [hashedPassword, email], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, message: 'Error updating password.' });
                }

                res.json({ success: true, message: 'Password has been reset successfully.' });
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
        }
    });
});

// Serve user data to frontend
app.get('/user-data', (req, res) => {
    if (req.session.user) {
        return res.json({ success: true, user: req.session.user });
    }
    res.json({ success: false, message: 'No user logged in.' });
});

// Serve all other dashboard pages
app.get('/dashboard/:page', (req, res) => {
    const validPages = ['search', 'inbox', 'calendar', 'todo', 'contacts', 'invoice', 'settings'];
    if (validPages.includes(req.params.page)) {
        return res.sendFile(path.join(__dirname, `public/dashboard/${req.params.page}.html`));
    }
    res.status(404).send('Page not found');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
