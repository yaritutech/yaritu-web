import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/dbConnect';
import BlogPost from '../../../../../models/BlogPost';
import { auth } from '../../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

// Public: fetch a single post by its slug. Published posts are visible to everyone;
// unpublished (draft) posts are only visible to logged-in admins so they can preview
// a draft before publishing it.
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { slug } = await params;
    const post = await BlogPost.findOne({ slug }).lean();
    if (!post) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });

    if (!post.published) {
      const session = await auth();
      const isAdmin = !!(session && (session.user?.isAdmin || session.user?.role === 'admin'));
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true, data: post });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
