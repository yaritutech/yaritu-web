import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/dbConnect';
import BlogPost from '../../../../models/BlogPost';
import { auth } from '../../auth/[...nextauth]/route';
import { sanitizeHtml } from '../../../../lib/sanitizeHtml';

export const dynamic = 'force-dynamic';

function slugify(text) {
  return (text || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function requireAdmin() {
  const session = await auth();
  if (!session) return { ok: false, status: 401, message: 'Not authenticated' };
  if (!(session.user?.isAdmin || session.user?.role === 'admin')) {
    return { ok: false, status: 403, message: 'Not authorized' };
  }
  return { ok: true };
}

// GET a single post by id (used by the admin edit modal to prefill data)
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const post = await BlogPost.findById(id).lean();
    if (!post) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: post });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function PUT(request, { params }) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ success: false, message: gate.message }, { status: gate.status });

  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const update = {
      title: body.title,
      excerpt: body.excerpt || '',
      content: body.contentType === 'html' ? sanitizeHtml(body.content) : body.content,
      contentType: body.contentType === 'html' ? 'html' : 'text',
      coverImage: body.coverImage || '',
      author: body.author || 'YARITU Team',
      category: body.category || '',
      tags: Array.isArray(body.tags) ? body.tags : [],
      published: body.published !== undefined ? !!body.published : true,
    };

    // Allow (optional) slug changes while keeping them unique
    if (body.slug) {
      let baseSlug = slugify(body.slug);
      if (baseSlug) {
        let slug = baseSlug;
        let counter = 1;
        while (await BlogPost.exists({ slug, _id: { $ne: id } })) {
          slug = `${baseSlug}-${counter}`;
          counter += 1;
        }
        update.slug = slug;
      }
    }

    const updated = await BlogPost.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating blog post', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ success: false, message: gate.message }, { status: gate.status });

  try {
    await dbConnect();
    const { id } = await params;
    const deleted = await BlogPost.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: deleted });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
