"use client";

import { useParams } from "next/navigation";
import Collection from "../page";

export default function CollectionTypePage() {
  const params = useParams();
  const slug = params.slug;

  return <Collection key={slug} />;
}
