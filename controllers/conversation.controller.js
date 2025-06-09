const Conversation = require("../models/conversation.model");
const Comment = require("../models/comment.model");

// Get all conversations with comment counts
exports.getAllConversations = async (req, res) => {
  try {
    // Get all conversations
    const conversations = await Conversation.find()
      .sort({ createdAt: -1 })
      .populate("author", "username")
      .lean();

    // Get comment counts for all conversations
    const conversationIds = conversations.map((conv) => conv._id);
    const commentCounts = await Comment.aggregate([
      {
        $match: {
          conversation: { $in: conversationIds },
        },
      },
      {
        $group: {
          _id: "$conversation",
          commentCount: { $sum: 1 },
        },
      },
    ]);

    // Create a map of conversation ID to comment count
    const commentCountMap = new Map(
      commentCounts.map((item) => [item._id.toString(), item.commentCount])
    );

    // Add comment counts and isLiked status to conversations
    const conversationsWithCounts = conversations.map((conv) => ({
      ...conv,
      commentCount: commentCountMap.get(conv._id.toString()) || 0,
      isLiked: req.userId
        ? conv.likedBy.some((id) => id.toString() === req.userId.toString())
        : req.anonymousId
        ? conv.likedByAnonymous.includes(req.anonymousId)
        : false,
    }));

    res.json(conversationsWithCounts);
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
};

// Get a single conversation
exports.getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate("author", "username")
      .lean();

    if (!conversation) {
      return res.status(404).json("Conversation not found");
    }

    // Get comment count
    const commentCount = await Comment.countDocuments({
      conversation: req.params.id,
    });

    // Add comment count and isLiked status
    const conversationWithCount = {
      ...conversation,
      commentCount,
      isLiked: req.userId
        ? conversation.likedBy.some(
            (id) => id.toString() === req.userId.toString()
          )
        : req.anonymousId
        ? conversation.likedByAnonymous.includes(req.anonymousId)
        : false,
    };

    res.json(conversationWithCount);
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
};

// Create a new conversation
exports.createConversation = async (req, res) => {
  try {
    const { title, content, isAnonymous } = req.body;
    const conversation = new Conversation({
      title,
      content,
      isAnonymous,
      author: req.userId || null,
      anonymousAuthorId: !req.userId ? req.anonymousId : null,
    });

    const savedConversation = await conversation.save();
    res.json({
      ...savedConversation.toObject(),
      commentCount: 0,
      isLiked: false,
    });
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
};

// Like a conversation
exports.likeConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json("Conversation not found");
    }

    const userId = req.userId || null;
    const anonymousId = !req.userId ? req.anonymousId : null;

    // Check if already liked
    if (userId && conversation.likedBy.includes(userId)) {
      return res.status(400).json("Already liked");
    }
    if (anonymousId && conversation.likedByAnonymous.includes(anonymousId)) {
      return res.status(400).json("Already liked");
    }

    // Add like
    if (userId) {
      conversation.likedBy.push(userId);
    } else if (anonymousId) {
      conversation.likedByAnonymous.push(anonymousId);
    }
    conversation.likes += 1;

    await conversation.save();

    // Get comment count
    const commentCount = await Comment.countDocuments({
      conversation: req.params.id,
    });

    res.json({
      ...conversation.toObject(),
      commentCount,
      isLiked: true,
    });
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
};

// Unlike a conversation
exports.unlikeConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json("Conversation not found");
    }

    const userId = req.userId || null;
    const anonymousId = !req.userId ? req.anonymousId : null;

    // Remove like
    if (userId) {
      conversation.likedBy = conversation.likedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else if (anonymousId) {
      conversation.likedByAnonymous = conversation.likedByAnonymous.filter(
        (id) => id !== anonymousId
      );
    }
    conversation.likes = Math.max(0, conversation.likes - 1);

    await conversation.save();

    // Get comment count
    const commentCount = await Comment.countDocuments({
      conversation: req.params.id,
    });

    res.json({
      ...conversation.toObject(),
      commentCount,
      isLiked: false,
    });
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
};

// Get comments for a conversation
exports.getConversationComments = async (req, res) => {
  try {
    const comments = await Comment.find({ conversation: req.params.id })
      .populate("author", "username")
      .sort({ createdAt: 1 })
      .lean();
    res.json(comments);
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
};

// Add a comment to a conversation
exports.addComment = async (req, res) => {
  try {
    const { content, isAnonymous, parentComment } = req.body;
    const comment = new Comment({
      content,
      isAnonymous,
      author: req.userId || null,
      anonymousAuthorId: !req.userId ? req.anonymousId : null,
      conversation: req.params.id,
      parentComment: parentComment || null,
      isReply: !!parentComment,
    });

    const savedComment = await comment.save();
    const populatedComment = await Comment.findById(savedComment._id)
      .populate("author", "username")
      .lean();
    res.json(populatedComment);
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
};
