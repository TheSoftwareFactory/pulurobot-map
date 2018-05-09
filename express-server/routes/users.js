var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt-nodejs');
var User = require('../models/user');

/* GET users listing. */
router.get('/users', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/users', async(request, response) => {
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
