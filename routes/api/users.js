const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator/check');

const User = require('../../models/User');

// @route  POST api/users
// @desc   Register user
// @access Public
router.post(
  '/',
  [
    check('name', 'Name is required')
      .not()
      .isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({
      min: 6
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // 1) See if user exists
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      // 2) Get users gravatar
      const avatar = gravatar.url(email, {
        s: '200', // size
        r: 'pg', // rating - no naked people
        d: 'mm' // default image/icon, can use 404 like no file error
      });

      // Creates new instance, not actual user. To save it, user.save..
      user = new User({
        name,
        email,
        avatar,
        password
      });

      //  3) Encrypt password by bcrypt
      const salt = await bcrypt.genSalt(10); // 10 - rounds, more == more secure
      user.password = await bcrypt.hash(password, salt); // hash takes password and hash

      await user.save(); // to save User. anything that returns promise we can use await or then/catch

      // Example of then, catch
      // bcrpt.genSalt(10).then(bcrpt.hash(password, salt).then(user.save()));

      // 4) Return jsonwebtoken
      const payload = {
        user: {
          id: user.id // after user.save() mongoDB creates _id, but mongoose use abstraction
        }
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: 36000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
