// app/blog/page.js

import BlogListClient from './BlogListClient';

export const metadata = {
  title: 'Blog - YARITU | Wedding & Fashion Inspiration',
  description: 'Styling tips, wedding trends, and stories from the YARITU team. Discover inspiration for your next celebration.',
};

export default function BlogPage() {
  return <BlogListClient />;
}
