const express = require('express'); // to build api or web server
const mysql = require('mysql2'); // to connnect mysql
const cors = require('cors'); //to allow the frontend to communicate with backend.
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config();
const path = require('path');
const uploadRoute = require('./routes/uploadRoute'); 

const app = express();
const PORT = process.env.PORT || 5000;  //backend run on 5000 port

//Middleware
app.use(cors({
  origin: 'http://localhost:3000', // frontend port
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: 'blog_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true only if using HTTPS
    httpOnly: true
  }
}));

//
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'blog'
});

db.connect(err => {
  if (err) throw err;
  console.log('Database connected.');
});

// Register
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  const hash = bcrypt.hashSync(password, 10);

  db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email, hash],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'User registered successfully' });
    });
});

//Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ message: 'User not found' });

    const user = results[0];
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

    req.session.user = { id: user.id, username: user.username };
    res.json({ message: 'Login successful', user: req.session.user });
  });
});


// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.clearCookie('connect.sid');
  res.json({ message: 'Logged out successfully' });
});

//Auth Check
app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Create Post
app.post('/api/posts', (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'Unauthorized' });

  const { title, content } = req.body;
  const userId = req.session.user.id;

  db.query('INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)',
    [title, content, userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Post created successfully' });
    });
});

// Get All Posts
app.get('/api/posts', (req, res) => {
  db.query(`SELECT posts.*, users.username AS author 
            FROM posts 
            JOIN users ON posts.author_id = users.id 
            ORDER BY posts.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    });
});

// Get Single Post
app.get('/api/posts/:id', (req, res) => {
  db.query('SELECT * FROM posts WHERE id = ?', [req.params.id], (err, result) => {
    if (err || result.length === 0) return res.status(404).json({ message: 'Post not found' });
    res.json(result[0]);
  });
});

// Update Post
app.put('/api/posts/:id', (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'Unauthorized' });

  const { title, content } = req.body;
  const userId = req.session.user.id;
  const postId = req.params.id;

  db.query('SELECT * FROM posts WHERE id = ? AND author_id = ?', [postId, userId], (err, result) => {
    if (err || result.length === 0) return res.status(403).json({ message: 'Permission denied' });

    db.query('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title, content, postId], (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Post updated' });
    });
  });
});

// Delete Post
app.delete('/api/posts/:id', (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'Unauthorized' });

  const postId = req.params.id;
  const userId = req.session.user.id;

  db.query('DELETE FROM posts WHERE id = ? AND author_id = ?', [postId, userId], (err, result) => {
    if (err || result.affectedRows === 0) return res.status(403).json({ message: 'Permission denied' });
    res.json({ message: 'Post deleted' });
  });
});


// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use the upload route
app.use(uploadRoute);


app.listen(PORT, () => console.log(`Server running on port : ${PORT}`));


