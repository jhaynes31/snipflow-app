"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function BlogPage() {
  const blogs = useQuery(api.blogs.list);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-primary">SnipFlow Blog</h1>
        <div className="grid gap-8">
          {blogs === undefined ? (
            <p>Loading posts...</p>
          ) : blogs.length === 0 ? (
            <p>No posts yet. Stay tuned!</p>
          ) : (
            blogs.map((post) => (
              <article key={post._id} className="border border-border p-6 rounded-lg hover:border-primary transition-colors">
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="text-2xl font-semibold mb-2 hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                </Link>
                <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                  <span>By {post.author}</span>
                  <span>•</span>
                  <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                </div>
                <p className="text-muted-foreground mb-4">
                  {post.excerpt}
                </p>
                <Link 
                  href={`/blog/${post.slug}`}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Read more →
                </Link>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
