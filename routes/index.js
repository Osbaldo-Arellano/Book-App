const express = require('express')
const router = express.Router()
const path = require('path')

function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) return next();
	res.redirect('/login');
}

app.get('/', isLoggedIn, (req, res) => {
	res.render("index", { title: "Home" });
});


module.exports = router;