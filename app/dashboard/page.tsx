"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Video, Download, ExternalLink, Users, Gift, Copy, Check, Layers, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const id = localStorage.getItem("snipflow_anon_id");
      if (id) {
        setAnonymousId(id);
      } else {
        router.push("/login");
      }
    }
  }, [isAuthenticated, authLoading, router]);

  const user = useQuery(api.users.me);
  const packs = useQuery(api.content.listMyPacks, { anonymousId: anonymousId || undefined });

  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}?ref=${user?.referralCode}` 
    : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || (isAuthenticated && (user === undefined || packs === undefined))) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const processingPacks = packs?.filter(p => p.status === "processing") || [];

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">Your Content Dashboard</h1>
          <p className="text-foreground/70">Manage your video repurposing projects and batches.</p>
          {user?.plan === "monthly" && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${((user.usageCount ?? 0) / 5) * 100}%` }}
                />
              </div>
              <span className="text-xs text-foreground/60">{user.usageCount ?? 0} / 5 packs used this month</span>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          {user?.email === "admin@snipflow.com" && (
            <Link href="https://app.posthog.com" target="_blank">
              <Button variant="ghost" size="sm" className="text-xs text-foreground/50">
                Analytics
              </Button>
            </Link>
          )}
          <Link href="/app">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Video className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
      </div>
      
      {processingPacks.length > 0 && (
        <Card className="mb-12 border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Currently Processing
                </CardTitle>
                <CardDescription>We're turning your videos into content. This usually takes 1-2 minutes per video.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {processingPacks.map(p => (
                        <div key={p._id} className="flex items-center justify-between bg-background/50 p-3 rounded-lg border border-border">
                            <div className="flex items-center gap-3 truncate">
                                <Video className="h-4 w-4 text-foreground/40 shrink-0" />
                                <span className="text-sm font-medium truncate">{p.videoTitle}</span>
                            </div>
                            <Link href={`/app?id=${p._id}`}>
                                <Button variant="ghost" size="sm" className="text-xs text-primary">
                                    View Progress <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      )}

      <div className="grid gap-8 md:grid-cols-3 mb-12">
        <Card className="md:col-span-2 bg-card border-border overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Gift size={120} />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="text-primary h-5 w-5" />
              Refer & Earn Free Content
            </CardTitle>
            <CardDescription>
              Invite your friends to SnipFlow. For every 3 friends who process their first video, you get a free Lifetime Unlock or 5 bonus content packs!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm font-mono truncate">
                {referralLink}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-foreground/60">Referrals</span>
                  <span className="text-xl font-bold">{user?.qualifiedReferrals ?? 0}</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex flex-col">
                  <span className="text-foreground/60">Bonus Packs</span>
                  <span className="text-xl font-bold">{user?.bonusPacks ?? 0}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-foreground/40 block mb-1">Progress to next reward</span>
                <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${((user?.qualifiedReferrals ?? 0) % 3 / 3) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-foreground/60 space-y-4">
              <p>You have referred <strong>{user?.qualifiedReferrals ?? 0}</strong> creators.</p>
              {user?.bonusPacks && user.bonusPacks > 0 ? (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs">
                  ✨ You have {user.bonusPacks} bonus packs available!
                </div>
              ) : null}
              <p className="text-xs">Rewards are automatically applied when your referrals process their first video.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Previous Projects
        </h2>
      </div>

      {packs && packs.length === 0 ? (
        <Card className="bg-card border-border border-dashed text-center py-20">
          <CardContent>
            <Video className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No content packs yet</h3>
            <p className="text-foreground/60 mb-6">Create your first pack to see it here.</p>
            <Link href="/app">
              <Button variant="outline">Get Started</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packs?.filter(p => p.status !== "processing").map((pack) => (
            <Card key={pack._id} className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg truncate">{pack.videoTitle}</CardTitle>
                <CardDescription className="truncate">{pack.videoUrl || "Direct Upload"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60">Status:</span>
                  <span className={`font-medium ${
                    pack.status === 'completed' ? 'text-green-500' : 
                    pack.status === 'failed' ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                    {pack.status.charAt(0).toUpperCase() + pack.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60">Payment:</span>
                  <span className={`font-medium ${pack.isPaid ? 'text-green-500' : 'text-yellow-500'}`}>
                    {pack.isPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/app?id=${pack._id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      View
                    </Button>
                  </Link>
                  {pack.status === 'completed' && pack.isPaid && (
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
