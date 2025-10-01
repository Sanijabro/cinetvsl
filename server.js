const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./movies.db");

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: "cinetvslSecret", resave: false, saveUninitialized: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

// Create tables
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS movies (id INTEGER PRIMARY KEY, title TEXT, description TEXT, link TEXT, poster TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");
  // Default admin user: admin / admin123
  db.get("SELECT * FROM admin WHERE username = ?", ["admin"], (err, row) => {
    if (!row) {
      const hash = bcrypt.hashSync("admin123", 10);
      db.run("INSERT INTO admin (username, password) VALUES (?, ?)", ["admin", hash]);
    }
  });
});

// Routes
app.get("/", (req, res) => {
  const q = req.query.search || "";
  db.all("SELECT * FROM movies WHERE title LIKE ?", [`%${q}%`], (err, movies) => {
    res.render("index", { movies, search: q });
  });
});

app.get("/login", (req, res) => res.render("login"));
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM admin WHERE username = ?", [username], (err, user) => {
    if (user && bcrypt.compareSync(password, user.password)) {
      req.session.user = user;
      res.redirect("/admin");
    } else {
      res.send("Invalid login");
    }
  });
});

app.get("/admin", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("admin");
});

app.post("/add", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  const { title, description, link, poster } = req.body;
  db.run("INSERT INTO movies (title, description, link, poster) VALUES (?, ?, ?, ?)", [title, description, link, poster]);
  res.redirect("/");
});

app.listen(3000, () => console.log("cinetvsl running on http://localhost:3000"));
