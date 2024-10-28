-- Create the database
CREATE DATABASE IF NOT EXISTS mentorship_platform;

-- Use the newly created database
USE mentorship_platform;

-- Drop existing tables if they exist (for testing purposes)
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Session;
DROP TABLE IF EXISTS Request;
DROP TABLE IF EXISTS Communications;
DROP TABLE IF EXISTS Contacts;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Tasks;

-- Create the Users table with a column to differentiate between mentors and mentorees
CREATE TABLE Users (
    userID INT AUTO_INCREMENT PRIMARY KEY,  -- Unique identifier for users
    name VARCHAR(100) NOT NULL,             -- User's name
    email VARCHAR(100) NOT NULL UNIQUE,     -- User's email (unique)
    password VARCHAR(255) NOT NULL,         -- User's password (hashed for production)
    userType ENUM('mentor', 'mentoree') NOT NULL, -- Type of user (mentor or mentoree)
    expertise VARCHAR(255),                 -- Field of expertise (null for mentorees)
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Timestamp of creation
);

-- Create the Session table
CREATE TABLE Session (
    sessionID INT AUTO_INCREMENT PRIMARY KEY, -- Unique identifier for session
    mentorID INT,                             -- Foreign key to Users (mentor)
    mentoreeID INT,                           -- Foreign key to Users (mentoree)
    date DATETIME NOT NULL,                   -- Date and time of the session
    status VARCHAR(50) DEFAULT 'pending',     -- Status of the session (e.g., pending, completed)
    sessionFee FLOAT,                         -- Fee for the session
    FOREIGN KEY (mentorID) REFERENCES Users(userID),  -- Relationship to Mentor
    FOREIGN KEY (mentoreeID) REFERENCES Users(userID) -- Relationship to Mentoree
);

-- Create the Request table
CREATE TABLE Request (
    requestID INT AUTO_INCREMENT PRIMARY KEY, -- Unique identifier for request
    mentorID INT,                             -- Foreign key to Users (mentor)
    mentoreeID INT,                           -- Foreign key to Users (mentoree)
    status VARCHAR(50) DEFAULT 'pending',     -- Status of the request (e.g., pending, accepted, declined)
    FOREIGN KEY (mentorID) REFERENCES Users(userID), -- Relationship to Mentor
    FOREIGN KEY (mentoreeID) REFERENCES Users(userID) -- Relationship to Mentoree
);

-- Create the Payment table
CREATE TABLE Payment (
    paymentID INT AUTO_INCREMENT PRIMARY KEY, -- Unique identifier for payment
    mentoreeID INT,                           -- Foreign key to Users (mentoree)
    mentorID INT,                             -- Foreign key to Users (mentor)
    amount FLOAT NOT NULL,                    -- Payment amount
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Date when the payment was made
    status VARCHAR(50) DEFAULT 'completed',   -- Status of the payment (e.g., completed)
    FOREIGN KEY (mentoreeID) REFERENCES Users(userID), -- Relationship to Mentoree
    FOREIGN KEY (mentorID) REFERENCES Users(userID) -- Relationship to Mentor
);

-- Create the Communications table (messages between users)
CREATE TABLE Communications (
    communicationID INT AUTO_INCREMENT PRIMARY KEY, -- Unique identifier for each communication
    senderID INT,                                   -- Sender's userID (foreign key from Users)
    receiverID INT,                                 -- Receiver's userID (foreign key from Users)
    subject VARCHAR(255) NOT NULL,                  -- Subject of the message
    body TEXT NOT NULL,                             -- Body of the message
    dateSent TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Date when the message was sent
    status ENUM('sent', 'read') DEFAULT 'sent',     -- Message status (sent or read)
    FOREIGN KEY (senderID) REFERENCES Users(userID), -- Foreign key to Users for the sender
    FOREIGN KEY (receiverID) REFERENCES Users(userID) -- Foreign key to Users for the receiver
);

-- Create the Contacts table (friendships between users)
CREATE TABLE Contacts (
    contactID INT AUTO_INCREMENT PRIMARY KEY,  -- Unique identifier for each contact relationship
    userID1 INT,                               -- First user's ID (foreign key from Users)
    userID2 INT,                               -- Second user's ID (foreign key from Users)
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending', -- Status of the contact relationship
    FOREIGN KEY (userID1) REFERENCES Users(userID),  -- Foreign key to Users for the first user
    FOREIGN KEY (userID2) REFERENCES Users(userID)   -- Foreign key to Users for the second user
);


-- Create the Tasks table to store user tasks
CREATE TABLE Tasks (
    taskID INT AUTO_INCREMENT PRIMARY KEY,   -- Unique identifier for each task
    userID INT NOT NULL,                     -- Foreign key to Users table
    title VARCHAR(255) NOT NULL,             -- Title of the task
    start DATETIME NOT NULL,                 -- Start date and time of the task
    FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE -- Delete tasks when the user is deleted
);

-- Sample data for Tasks table
INSERT INTO Tasks (userID, title, start)
VALUES
    (5, 'Coaching Meetup', '2024-10-22 10:00:00'),
    (6, 'Vue Meetup', '2024-10-28 15:00:00'),
    (7, 'React Workshop', '2024-10-29 12:00:00');


-- Insert sample data into the Users table (mentors and mentorees)
INSERT INTO Users (name, email, password, userType, expertise)
VALUES
    ('John Doe', 'john@mentor.com', '123456', 'mentor', 'Software Engineering'),
    ('Jane Smith', 'jane@mentor.com', '123456', 'mentor', 'Marketing'),
    ('Sam Wilson', 'sam@mentor.com', '123456', 'mentor', 'Data Science'),
    ('Mia Davis', 'mia@mentor.com', '123456', 'mentor', 'Life Coaching'),
    ('David Lee', 'david@mentor.com', '123456', 'mentor', 'Cybersecurity'),
    ('Alice Brown', 'alice@mentoree.com', '123456', 'mentoree', NULL),
    ('Michael Scott', 'michael@mentoree.com', '123456', 'mentoree', NULL),
    ('Rachel Green', 'rachel@mentoree.com', '123456', 'mentoree', NULL),
    ('James Bond', 'james@mentoree.com', '123456', 'mentoree', NULL),
    ('Monica Geller', 'monica@mentoree.com', '123456', 'mentoree', NULL);

-- Sample session data
INSERT INTO Session (mentorID, mentoreeID, date, status, sessionFee)
VALUES
    (1, 6, '2024-10-15 10:00:00', 'completed', 120),
    (2, 7, '2024-10-16 14:00:00', 'pending', 100),
    (3, 8, '2024-10-17 09:00:00', 'completed', 150),
    (4, 9, '2024-10-18 16:00:00', 'completed', 200),
    (5, 10, '2024-10-19 11:00:00', 'pending', 180);

-- Sample request data
INSERT INTO Request (mentorID, mentoreeID, status)
VALUES
    (1, 6, 'accepted'),
    (2, 7, 'pending'),
    (3, 8, 'declined'),
    (4, 9, 'accepted'),
    (5, 10, 'pending');

-- Sample payment data
INSERT INTO Payment (mentoreeID, mentorID, amount, status)
VALUES
    (6, 1, 120, 'completed'),
    (7, 2, 100, 'completed'),
    (8, 3, 150, 'completed'),
    (9, 4, 200, 'completed'),
    (10, 5, 180, 'pending');

-- Sample communications data
INSERT INTO Communications (senderID, receiverID, subject, body, status)
VALUES
    (1, 6, 'Session Request', 'Hi Alice, I would like to schedule a session with you.', 'sent'),
    (6, 1, 'Session Confirmation', 'Hi John, I confirm the session for October 15th.', 'read'),
    (2, 7, 'Marketing Tips', 'Hi Michael, here are some tips on marketing.', 'sent'),
    (7, 2, 'Re: Marketing Tips', 'Thanks for the tips!', 'read');

-- Sample contacts data
INSERT INTO Contacts (userID1, userID2, status)
VALUES
    (1, 6, 'accepted'),
    (2, 7, 'pending'),
    (3, 8, 'accepted'),
    (4, 9, 'accepted'),
    (5, 10, 'pending');
