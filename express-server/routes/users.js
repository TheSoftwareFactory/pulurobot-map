var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
var User = require('../models/user');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/', async(request, response) => {
  try {
    console.log(request);
    const body = request.body;
    console.log(body);
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(body.password, saltRounds);

    var user = new User(body.username, passwordHash);

    const savedUser = await user.save();

    response.json(savedUser);
  } catch (exception) {
    console.log(exception);
    response.status(500).json({ error: 'something went wrong...' });
  }
});

module.exports = router;
