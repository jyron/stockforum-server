const Conversation = require("../models/conversation.model");
const Comment = require("../models/comment.model");

// Get all conversations with comment counts
exports.getAllConversations = async (req, res) => {
  try {
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
        : false,
    }));

    res.json(conversationsWithCounts);
  } catch (err) {
    res.status(400).json({ message: "Error: " + err.message });
  }
};

// Get a single conversation
exports.getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate("author", "username")
      .lean();

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
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
        : false,
    };

    res.json(conversationWithCount);
  } catch (err) {
    res.status(400).json({ message: "Error: " + err.message });
  }
};

// Create a new conversation
exports.createConversation = async (req, res) => {
  try {
    const { title, content } = req.body;
    const conversation = new Conversation({
      title,
      content,
      author: req.userId,
    });

    const savedConversation = await conversation.save();
    const populatedConversation = await Conversation.findById(
      savedConversation._id
    )
      .populate("author", "username")
      .lean();

    res.status(201).json({
      ...populatedConversation,
      commentCount: 0,
      isLiked: false,
    });
  } catch (err) {
    res.status(400).json({ message: "Error: " + err.message });
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
    res.status(400).json({ message: "Error: " + err.message });
  }
};

// Add a comment to a conversation
exports.addComment = async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    const comment = new Comment({
      content,
      author: req.userId,
      conversation: req.params.id,
      parentComment,
    });

    const savedComment = await comment.save();
    const populatedComment = await Comment.findById(savedComment._id)
      .populate("author", "username")
      .lean();

    res.status(201).json(populatedComment);
  } catch (err) {
    res.status(400).json({ message: "Error: " + err.message });
  }
};

// Like a conversation
exports.likeConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check if user already liked
    if (conversation.likedBy.includes(req.userId)) {
      return res
        .status(400)
        .json({ message: "You already liked this conversation" });
    }

    conversation.likedBy.push(req.userId);
    conversation.likes += 1;
    await conversation.save();

    res.json({
      ...conversation.toObject(),
      isLiked: true,
    });
  } catch (err) {
    res.status(400).json({ message: "Error: " + err.message });
  }
};

// Unlike a conversation
exports.unlikeConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check if user has liked
    if (!conversation.likedBy.includes(req.userId)) {
      return res
        .status(400)
        .json({ message: "You haven't liked this conversation" });
    }

    conversation.likedBy = conversation.likedBy.filter(
      (id) => id.toString() !== req.userId.toString()
    );
    conversation.likes -= 1;
    await conversation.save();

    res.json({
      ...conversation.toObject(),
      isLiked: false,
    });
  } catch (err) {
    res.status(400).json({ message: "Error: " + err.message });
  }
};
