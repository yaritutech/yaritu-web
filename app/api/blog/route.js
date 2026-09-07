import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/dbConnect';
import BlogPost from '../../../models/BlogPost';
import { auth } from '../auth/[...nextauth]/route';
import { sanitizeHtml } from '../../../lib/sanitizeHtml';

export const dynamic = 'force-dynamic';

function slugify(text) {
  return (text || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function isAdminSession() {
  const session = await auth();
  if (!session) return false;
  return !!(session.user?.isAdmin || session.user?.role === 'admin');
}

// GET /api/blog            -> published posts only (public blog page)
// GET /api/blog?all=1      -> all posts including drafts (admin management view)
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const wantsAll = searchParams.get('all') === '1';

    let filter = { published: true };
    if (wantsAll) {
      const admin = await isAdminSession();
      if (admin) filter = {};
    }

    const posts = await BlogPost.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: posts });
  } catch (err) {
    console.error('Error fetching blog posts', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/blog -> create a new blog post (admin only)
export async function POST(request) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
  if (!(session.user?.isAdmin || session.user?.role === 'admin')) {
    return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
  }

  try {
    await dbConnect();
    const body = await request.json();

    if (!body.title || !body.content) {
      return NextResponse.json({ success: false, message: 'Title and content are required' }, { status: 400 });
    }

    let baseSlug = slugify(body.slug || body.title);
    if (!baseSlug) baseSlug = 'post';
    let slug = baseSlug;
    let counter = 1;
    // Ensure slug uniqueness
    while (await BlogPost.exists({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    const created = await BlogPost.create({
      title: body.title,
      slug,
      excerpt: body.excerpt || '',
      content: body.contentType === 'html' ? sanitizeHtml(body.content) : body.content,
      contentType: body.contentType === 'html' ? 'html' : 'text',
      coverImage: body.coverImage || '',
      author: body.author || 'YARITU Team',
      category: body.category || '',
      tags: Array.isArray(body.tags) ? body.tags : [],
      published: body.published !== undefined ? !!body.published : true,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error('Error creating blog post', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
