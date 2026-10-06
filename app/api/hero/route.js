// import { NextResponse } from 'next/server';
// import dbConnect from '../../../lib/dbConnect';
// import HeroImage from '../../../models/HeroImage';
// import { auth } from '../auth/[...nextauth]/route';

// export const revalidate = 3600; // Cache for 1 hour

// export async function GET() {
//   try {
//     await dbConnect();
//     const items = await HeroImage.find({}).sort({ order: 1 });
//     // ensure legacy documents without visibility default to 'both'
//     const normalized = items.map(it => ({ ...it.toObject ? it.toObject() : it, visibility: (it.visibility || 'both') }));

//     const response = NextResponse.json({ success: true, data: normalized });
//     response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
//     return response;
//   } catch (err) {
//     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
//   }
// }

// export async function POST(request) {
//   const session = await auth();
//   if (!session) return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });

//   try {
//     await dbConnect();
//     const body = await request.json();
//     const created = await HeroImage.create(body);
//     return NextResponse.json({ success: true, data: created }, { status: 201 });
//   } catch (err) {
//     return NextResponse.json({ success: false, error: err.message }, { status: 400 });
//   }
// }
import { NextResponse } from "next/server";
import dbConnect from "../../../lib/dbConnect";
import HeroImage from "../../../models/HeroImage";
import { auth } from "../auth/[...nextauth]/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await dbConnect();

    const items = await HeroImage.find({}).sort({ order: 1 }).lean();

    const normalized = items.map((item) => ({
      ...item,
      visibility: item.visibility || "both",
    }));

    const response = NextResponse.json({
      success: true,
      data: normalized,
    });

    // IMPORTANT:
    // Hero images are admin-managed, so never cache this API response.
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );

    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (err) {
    console.error("Hero GET error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 },
      );
    }

    await dbConnect();

    const body = await request.json();

    if (!body.imageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "imageUrl is required",
        },
        { status: 400 },
      );
    }

    const created = await HeroImage.create({
      title: body.title || "",
      imageUrl: body.imageUrl,
      link: body.link || "",
      visibility: body.visibility || "both",
    });

    return NextResponse.json(
      {
        success: true,
        data: created,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Hero POST error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 400 },
    );
  }
}
