const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');

// Common skill keywords for detection
const SKILL_KEYWORDS = [
  'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node', 'nodejs',
  'express', 'mongodb', 'sql', 'html', 'css', 'typescript', 'php', 'ruby',
  'swift', 'kotlin', 'flutter', 'dart', 'rust', 'go', 'golang', 'docker',
  'kubernetes', 'aws', 'azure', 'gcp', 'firebase', 'graphql', 'rest',
  'machine learning', 'ml', 'ai', 'artificial intelligence', 'data science',
  'deep learning', 'tensorflow', 'pytorch', 'django', 'flask', 'spring',
  'nextjs', 'next.js', 'tailwind', 'bootstrap', 'sass', 'figma',
  'ui', 'ux', 'design', 'devops', 'ci/cd', 'git', 'github',
  'linux', 'c++', 'c#', '.net', 'unity', 'unreal', 'blockchain',
  'solidity', 'web3', 'cybersecurity', 'networking', 'cloud',
  'agile', 'scrum', 'project management', 'leadership', 'communication',
  'marketing', 'seo', 'content writing', 'copywriting', 'sales'
];

// Detect skills in text
function detectSkills(text) {
  const lowerText = text.toLowerCase();
  return SKILL_KEYWORDS.filter(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(lowerText);
  });
}

// GET /api/posts - Get all posts (feed)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name headline profilePicture')
      .populate('comments.user', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts - Create a new post
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { caption, image } = req.body;

    if (!caption) {
      return res.status(400).json({ error: 'Caption is required' });
    }

    // Detect skills in the caption
    const detectedSkills = detectSkills(caption);

    const post = new Post({
      author: req.user._id,
      caption,
      image: image || '',
      detectedSkills
    });

    await post.save();

    // Skill Match Notification logic
    if (detectedSkills.length > 0) {
      // Find other users who have matching skills in their profile
      const matchingUsers = await User.find({
        _id: { $ne: req.user._id },
        skills: { $in: detectedSkills }
      });

      // Also find users who posted with matching skills
      const matchingPosts = await Post.find({
        author: { $ne: req.user._id },
        detectedSkills: { $in: detectedSkills }
      }).populate('author', 'name');

      // Collect unique user IDs from matching posts
      const notifiedUserIds = new Set();

      for (const matchUser of matchingUsers) {
        const commonSkills = matchUser.skills.filter(s => detectedSkills.includes(s));
        if (commonSkills.length > 0 && !notifiedUserIds.has(matchUser._id.toString())) {
          notifiedUserIds.add(matchUser._id.toString());
          const skillList = commonSkills.join(', ');
          await Notification.create({
            recipient: req.user._id,
            sender: matchUser._id,
            type: 'skill_match',
            skill: skillList,
            message: `You and ${matchUser.name} both share skills in ${skillList}. Consider connecting!`,
            postId: post._id
          });
        }
      }

      for (const matchPost of matchingPosts) {
        if (matchPost.author && !notifiedUserIds.has(matchPost.author._id.toString())) {
          notifiedUserIds.add(matchPost.author._id.toString());
          const commonSkills = matchPost.detectedSkills.filter(s => detectedSkills.includes(s));
          const skillList = commonSkills.join(', ');
          await Notification.create({
            recipient: req.user._id,
            sender: matchPost.author._id,
            type: 'skill_match',
            skill: skillList,
            message: `You and ${matchPost.author.name} both mentioned ${skillList}. Consider connecting since you share similar skills!`,
            postId: post._id
          });
        }
      }
    }

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'name headline profilePicture');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/posts/:id/like - Toggle like on a post
router.put('/:id/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const userId = req.user._id;
    const likeIndex = post.likes.indexOf(userId);

    if (likeIndex === -1) {
      post.likes.push(userId);

      // Create like notification (don't notify yourself)
      if (post.author.toString() !== userId.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'like',
          message: `${req.user.name} liked your post.`,
          postId: post._id
        });
      }
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'name headline profilePicture')
      .populate('comments.user', 'name profilePicture');

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts/:id/comment - Add comment to a post
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.comments.push({ user: req.user._id, text });
    await post.save();

    // Create comment notification (don't notify yourself)
    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        message: `${req.user.name} commented on your post: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
        postId: post._id
      });
    }

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'name headline profilePicture')
      .populate('comments.user', 'name profilePicture');

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
