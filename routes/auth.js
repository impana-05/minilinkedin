const express = require('express');
const router = express.Router();
const User = require('../models/User');
const admin = require('../config/firebase');

// POST /api/auth/register - Create user in MongoDB after Firebase signup
router.post('/register', async (req, res) => {
  try {
    const { firebaseUid, name, email } = req.body;

    if (!firebaseUid || !name || !email) {
      return res.status(400).json({ error: 'firebaseUid, name, and email are required' });
    }

    // Check if user already exists
    let user = await User.findOne({ firebaseUid });
    if (user) {
      return res.json({ user, message: 'User already exists' });
    }

    user = new User({ firebaseUid, name, email });
    await user.save();
    res.status(201).json({ user, message: 'User registered successfully' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login - Get user doc by Firebase UID
router.post('/login', async (req, res) => {
  try {
    const { firebaseUid } = req.body;

    if (!firebaseUid) {
      return res.status(400).json({ error: 'firebaseUid is required' });
    }

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;
