// app/blog/[slug]/page.js

import { notFound } from 'next/navigation';
import dbConnect from '../../../lib/dbConnect';
import BlogPost from '../../../models/BlogPost';
import { auth } from '../../api/auth/[...nextauth]/route';
import { stripHtmlTags } from '../../../lib/sanitizeHtml';
import BlogPostClient from './BlogPostClient';

export const dynamic = 'force-dynamic';

async function getPost(slug) {
  await dbConnect();
  const post = await BlogPost.findOne({ slug }).lean();
  if (!post) return null;

  if (!post.published) {
    const session = await auth();
    const isAdmin = !!(session && (session.user?.isAdmin || session.user?.role === 'admin'));
    if (!isAdmin) return null;
  }

  // Convert to a plain, JSON-serializable object for the client component
  return JSON.parse(JSON.stringify(post));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const post = await getPost(slug);
    if (!post) {
      return { title: 'Post Not Found - YARITU Blog' };
    }
    const rawDescriptionSource = post.contentType === 'html' ? stripHtmlTags(post.content) : post.content;
    const description = post.excerpt || rawDescriptionSource?.slice(0, 155) || '';
    return {
      title: `${post.title} - YARITU Blog`,
      description,
      openGraph: {
        title: post.title,
        description,
        images: post.coverImage ? [{ url: post.coverImage }] : undefined,
      },
    };
  } catch (err) {
    return { title: 'YARITU Blog' };
  }
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return <BlogPostClient initialPost={post} />;
}
