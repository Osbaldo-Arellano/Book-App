const request = require("request");
const path = require("path");
const express = require("express");
const session = require("express-session");
const exphbs = require("express-handlebars");
const mongoose = require("mongoose");
const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const app = express();
const db = require("./db");
const { Server } = require("http");
const { time } = require("console");
const { json } = require("express");
db.connect();
require("dotenv").config();

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("User", UserSchema);

// Middleware
app.set("views", path.join(__dirname, "views"));
app.engine(
  "hbs",
  exphbs.engine({
    extname: ".hbs",
    partialsDir: path.join(app.get("views"), "partials"),
    helpers: {
      toJSON: function (object) {
        return JSON.stringify(object);
      },
    },
  })
);
app.set("view engine", "hbs");
app.use(express.static(__dirname + "/public"));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Passport.js
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new localStrategy(function (username, password, done) {
    User.findOne({ username: username }, function (err, user) {
      if (err) return done(err);
      if (!user) return done(null, false, { message: "Incorrect username." });

      bcrypt.compare(password, user.password, function (err, res) {
        if (err) return done(err);
        if (res === false)
          return done(null, false, { message: "Incorrect password." });

        return done(null, user);
      });
    });
  })
);

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

function isLoggedOut(req, res, next) {
  if (!req.isAuthenticated()) return next();
  res.redirect("/");
}

// ROUTES
app.get("/", isLoggedIn, (req, res) => {
  // Choose random author
  const request = require("request");
  const result = request(
    "https://poetrydb.org/author,linecount/Shakespeare;14",
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var min = Math.ceil(1);
        var max = Math.floor(30);
        var ranNum = Math.floor(Math.random() * (max - min) + min);

        const poem = JSON.parse(body);

        // Using an array to store individual poem lines.
        let lines = [];
        for (let i = 0; i < poem[ranNum].lines.length; i++) {
          if (poem[ranNum].lines[i + 1] != ",") {
            // Found a comma, push string
            lines.push(poem[ranNum].lines[i]);
          }
        }
        console.log(lines);

        res.render("index", {
          title: "Your Profile",
          poemTitle: poem[ranNum].title,
          lines: lines,
        });
      }
    }
  );
});

app.get("/homepage", isLoggedOut, (req, res) => {
  res.render("main");
});

app.get("/login", isLoggedOut, (req, res) => {
  const response = {
    title: "Login",
    error: req.query.error,
  };

  res.render("login", response);
});

app.get("/register", isLoggedOut, (req, res) => {
  // const response = {
  //   title: "Login",
  //   error: req.query.error,
  // };

  res.render("register"); //, response);
});

app.post("/subject", isLoggedIn, function (req, res) {
  const subject = req.body.subject;
  console.log(subject);

  const url = "http://openlibrary.org/subjects/" + subject + ".json?limit=20";
  const request = require("request");
  const result = request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      const json = JSON.parse(body);

      var titles = [];
      for (let i = 0; i < 20; i++) {
        titles.push(json.works[i].title);
      }

      console.log(titles);

      res.render("subjectList", { titles: titles });
    }
  });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login?error=true",
  })
);

app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// Setup our admin user
app.get("/setup", async (req, res) => {
  const exists = await User.exists({ username: "admin" });

  if (exists) {
    res.redirect("/login");
    return;
  }

  bcrypt.genSalt(10, function (err, salt) {
    if (err) return next(err);
    bcrypt.hash("pass", salt, function (err, hash) {
      if (err) return next(err);

      const newAdmin = new User({
        username: "admin",
        password: hash,
      });

      newAdmin.save();

      res.redirect("/login");
    });
  });
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
