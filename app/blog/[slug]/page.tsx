"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = useQuery(api.blogs.get, { slug: slug as string });

  if (post === undefined) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="max-w-3xl mx-auto px-4 py-12">
          <p>Loading post...</p>
        </main>
      </div>
    );
  }

  if (post === null) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link href="/blog" className="text-primary hover:underline flex items-center gap-1">
            <ChevronLeft size={16} />
            Back to blog
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/blog" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mb-8">
          <ChevronLeft size={16} />
          Back to blog
        </Link>
        
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-primary">{post.title}</h1>
          <div className="flex gap-4 text-sm text-muted-foreground mb-4">
            <span>By {post.author}</span>
            <span>•</span>
            <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
          </div>
        </header>

        <div 
          className="prose prose-invert prose-green max-w-none text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }} 
        />
      </main>
    </div>
  );
}
