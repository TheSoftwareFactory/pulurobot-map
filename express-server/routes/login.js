var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');

/* GET logi page. */
router.get('/', function(req, res, next) {
  res.render('login', { title: 'Express' });
});

router.post('/', function(req, res, next){
    const body = req.body;
    if(body.username && body.password){
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});


exports.index = function(req, res){
  res.render('login', { title: 'Login' });
};

module.exports = router;