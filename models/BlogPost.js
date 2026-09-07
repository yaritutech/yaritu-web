import mongoose from 'mongoose';

const BlogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title.'],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'Please provide a slug.'],
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  },
  excerpt: {
    type: String,
    trim: true,
    default: '',
  },
  content: {
    type: String,
    required: [true, 'Please provide content for the post.'],
  },
  // 'text'  -> content is plain text, rendered as simple paragraphs (default, legacy behavior)
  // 'html'  -> content is raw HTML (pasted or imported from an .html file), rendered as-is
  contentType: {
    type: String,
    enum: ['text', 'html'],
    default: 'text',
  },
  coverImage: {
    type: String,
    default: '',
  },
  author: {
    type: String,
    trim: true,
    default: 'YARITU Team',
  },
  category: {
    type: String,
    trim: true,
    default: '',
  },
  tags: {
    type: [String],
    default: [],
  },
  published: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.BlogPost || mongoose.model('BlogPost', BlogPostSchema);
