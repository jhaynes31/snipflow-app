"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Video, Youtube, Download, CheckCircle2, Lock, Upload, AlertCircle } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import JSZip from "jszip";
import posthog from 'posthog-js';

function AppContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPackId = searchParams.get("id");
  const initialBatchId = searchParams.get("batchId");
  const success = searchParams.get("success");

  const [urls, setUrls] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [packId, setPackId] = useState<string | null>(initialPackId);
  const [batchId, setBatchId] = useState<string | null>(initialBatchId);
  const [isPaying, setIsPaying] = useState(false);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["linkedin", "twitter", "tiktok", "carousel"]);
  const [twitterOnly, setTwitterOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  useEffect(() => {
    let id = localStorage.getItem("snipflow_anon_id");
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("snipflow_anon_id", id);
    }
    setAnonymousId(id);
  }, []);

  const user = useQuery(api.users.me); 
  const createPack = useMutation(api.content.createContentPack);
  const createBatch = useMutation(api.content.createBatch);
  const updatePack = useMutation(api.content.updateContentPack);
  
  const pack = useQuery(api.content.getPack, packId ? { id: packId as any } : "skip");
  const batch = useQuery(api.content.getBatch, batchId ? { id: batchId as any } : "skip");

  const activePacks = batch?.packs || (pack ? [pack] : []);
  const allCompleted = activePacks.length > 0 && activePacks.every(p => p.status === "completed");
  const anyProcessing = activePacks.some(p => p.status === "processing");
  const allPaid = activePacks.every(p => p.isPaid);

  useEffect(() => {
    if (allCompleted) {
      setIsProcessing(false);
    }
  }, [allCompleted]);

  useEffect(() => {
    if (success === "true" && (packId || batchId)) {
      if (packId && pack && !pack.isPaid) {
        updatePack({ id: packId as any, isPaid: true });
      }
      if (batchId && batch) {
        batch.packs.forEach(p => {
          if (!p.isPaid) updatePack({ id: p._id, isPaid: true });
        });
      }
      posthog.capture('payment_successful', { packId, batchId, plan: user?.plan });
    }
  }, [success, packId, batchId, pack, batch, updatePack, user]);

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urlList = urls.split("\n").map(u => u.trim()).filter(u => u.startsWith("http"));
    if (urlList.length === 0) return;

    if (user && user.plan === "monthly") {
        const remaining = (5 - (user.usageCount || 0)) + (user.bonusPacks || 0);
        if (urlList.length > remaining) {
            alert(`You only have ${remaining} packs left this month. Please reduce your batch size or upgrade to Lifetime.`);
            return;
        }
    }

    setIsProcessing(true);
    posthog.capture('batch_process_started', { count: urlList.length, type: 'youtube' });
    
    try {
      const bId = await createBatch({ anonymousId: anonymousId || undefined });
      setBatchId(bId);
      setPackId(null);

      for (const url of urlList) {
        const pId = await createPack({
          videoTitle: "Processing Video...",
          videoUrl: url,
          anonymousId: anonymousId || undefined,
          batchId: bId,
        });

        fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, packId: pId, options: { twitterOnly } }),
        }).catch(console.error);
      }
      
      router.push(`/app?batchId=${bId}`);
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (user && user.plan === "monthly") {
        const remaining = (5 - (user.usageCount || 0)) + (user.bonusPacks || 0);
        if (files.length > remaining) {
            alert(`You only have ${remaining} packs left this month. Please reduce your batch size or upgrade to Lifetime.`);
            return;
        }
    }

    setIsProcessing(true);
    posthog.capture('batch_process_started', { count: files.length, type: 'upload' });

    try {
      const bId = await createBatch({ anonymousId: anonymousId || undefined });
      setBatchId(bId);
      setPackId(null);

      for (const file of files) {
        const pId = await createPack({
          videoTitle: file.name,
          anonymousId: anonymousId || undefined,
          batchId: bId,
        });

        const formData = new FormData();
        formData.append("file", file);
        formData.append("packId", pId);
        formData.append("options", JSON.stringify({ twitterOnly }));

        fetch("/api/upload", {
          method: "POST",
          body: formData,
        }).catch(console.error);
      }

      router.push(`/app?batchId=${bId}`);
    } catch (error) {
      console.error(error);
      alert("Upload failed");
      setIsProcessing(false);
    }
  };

  const handlePayment = async (planType: string = "one-time") => {
    setIsPaying(true);
    posthog.capture('checkout_initiated', { planType, packId, batchId });
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          packId: packId || undefined, 
          batchId: batchId || undefined,
          userId: user?._id,
          planType 
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      alert("Failed to initiate payment");
    } finally {
      setIsPaying(false);
    }
  };

  const handleDownload = async () => {
    if (activePacks.length === 0) return;
    posthog.capture('content_pack_downloaded', { packId, batchId });
    const zip = new JSZip();
    
    activePacks.forEach((p, packIdx) => {
      const safeTitle = p.videoTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 30) || `Video-${packIdx + 1}`;
      const videoFolder = activePacks.length > 1 ? zip.folder(`${packIdx + 1}-${safeTitle}`) : zip;
      
      p.moments.forEach((moment: any, i: number) => {
        const momentFolder = videoFolder?.folder(`Moment-${i + 1}`);
        if (selectedPlatforms.includes("linkedin") && moment.linkedinPost) {
          momentFolder?.file("linkedin.txt", moment.linkedinPost);
        }
        if (selectedPlatforms.includes("twitter") && moment.twitterThread?.length > 0) {
          momentFolder?.file("twitter.txt", moment.twitterThread.join("\n\n"));
        }
        if (selectedPlatforms.includes("tiktok") && moment.tiktokCaption) {
          momentFolder?.file("tiktok.txt", moment.tiktokCaption);
        }
        if (selectedPlatforms.includes("carousel") && moment.linkedinCarousel && moment.linkedinCarousel.length > 0) {
          const carouselText = moment.linkedinCarousel.map((s: any) => `Slide ${s.slide} (${s.title}): ${s.content}`).join("\n\n");
          momentFolder?.file("linkedin-carousel.txt", carouselText);
        }
      });
    });

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = batchId ? `snipflow-batch-${batchId}.zip` : `snipflow-pack-${packId}.zip`;
    link.click();
  };

  if (authLoading || (isAuthenticated && user === undefined)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Create Content Pack</h1>
          <p className="text-foreground/70">Paste YouTube URLs (one per line) or upload multiple MP4 files.</p>
        </div>

        {(!packId && !batchId || (pack?.status === "failed") || (batch?.status === "failed")) && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-red-500" />
                  YouTube Links
                </CardTitle>
                <CardDescription>Enter one or more URLs</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBatchSubmit} className="space-y-4">
                  <Textarea
                    placeholder="https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/watch?v=..."
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    disabled={isProcessing}
                    className="bg-background border-border min-h-[100px]"
                  />
                  <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="twitterOnly-yt"
                    checked={twitterOnly}
                    onChange={(e) => setTwitterOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="twitterOnly-yt" className="text-sm text-foreground/70 cursor-pointer">
                    Twitter Thread only (Faster & saves tokens)
                  </label>
                  </div>
                  <Button type="submit" disabled={isProcessing || !urls.trim()} className="w-full bg-primary text-primary-foreground">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Process YouTube Batch"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Direct Upload
                </CardTitle>
                <CardDescription>Select one or more MP4 files</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  accept="video/mp4"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full h-32 border-dashed border-2 flex flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Video className="h-6 w-6 text-foreground/40" />
                  <span>Click to select MP4 files</span>
                  <span className="text-xs text-foreground/40">Multiple selection supported</span>
                </Button>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="twitterOnly-up"
                    checked={twitterOnly}
                    onChange={(e) => setTwitterOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="twitterOnly-up" className="text-sm text-foreground/70 cursor-pointer">
                    Twitter Thread only (Faster & saves tokens)
                  </label>
                </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {(batch || pack) && (
          <div className="space-y-6">
             {anyProcessing && (
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <p className="font-medium text-primary">Processing batch... Keep this page open.</p>
                    </div>
                    <span className="text-sm text-foreground/60">
                        {activePacks.filter(p => p.status === "completed").length} / {activePacks.length} completed
                    </span>
                </div>
             )}

             {allCompleted && (
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg flex items-center gap-3 text-green-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="font-medium">All videos in batch have been processed!</p>
                </div>
             )}

             <div className="flex flex-col gap-4">
               <div className="flex items-center gap-4">
                 <span className="text-sm font-medium text-foreground/60">Select Platforms:</span>
                 <div className="flex gap-2 p-1 bg-card border border-border rounded-lg w-fit">
                   {["linkedin", "twitter", "tiktok", "carousel"].map((platform) => (
                     <Button
                       key={platform}
                       variant={selectedPlatforms.includes(platform) ? "default" : "ghost"}
                       size="sm"
                       onClick={() => {
                         setSelectedPlatforms(prev =>
                           prev.includes(platform)
                             ? prev.filter(p => p !== platform)
                             : [...prev, platform]
                         )
                       }}
                       className="capitalize h-8"
                     >
                       {platform === "twitter" ? "X (Twitter)" :
                      platform === "carousel" ? "LinkedIn Carousel" :
                      platform}
                     </Button>
                   ))}
                 </div>
               </div>

               <div className="grid gap-8">
                 {activePacks.map((p, pIdx) => (
                   <div key={p._id} className="space-y-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold">{p.videoTitle}</h2>
                            {p.status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                            {p.status === "completed" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            {p.status === "failed" && <AlertCircle className="h-4 w-4 text-red-500" />}
                        </div>
                        
                        {p.status === "completed" && (
                            <div className="grid gap-6">
                                {p.moments.map((moment: any, i: number) => (
                                <Card key={i} className="bg-card border-border">
                                    <CardHeader>
                                    <CardTitle className="text-lg">Moment {i + 1}: {moment.timestamp}</CardTitle>
                                    <CardDescription>{moment.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                    {selectedPlatforms.includes("linkedin") && (
                                        <div>
                                        <h4 className="text-sm font-semibold text-primary mb-1">LinkedIn Post</h4>
                                        <p className="text-sm text-foreground/80 whitespace-pre-wrap p-3 bg-background rounded border border-border">{moment.linkedinPost}</p>
                                        </div>
                                    )}
                                    {selectedPlatforms.includes("twitter") && (
                                        <div>
                                        <h4 className="text-sm font-semibold text-primary mb-1">Twitter Thread</h4>
                                        <div className="space-y-2">
                                            {moment.twitterThread.map((tweet: string, j: number) => (
                                            <p key={j} className="text-sm text-foreground/80 p-3 bg-background rounded border border-border">
                                                {j + 1}/ {tweet}
                                            </p>
                                            ))}
                                        </div>
                                        </div>
                                    )}
                                    {selectedPlatforms.includes("tiktok") && (
                                        <div>
                                        <h4 className="text-sm font-semibold text-primary mb-1">TikTok Caption</h4>
                                        <p className="text-sm text-foreground/80 p-3 bg-background rounded border border-border">{moment.tiktokCaption}</p>
                                        </div>
                                    )}
                                    {selectedPlatforms.includes("carousel") && moment.linkedinCarousel && moment.linkedinCarousel.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-primary mb-1">LinkedIn Carousel Script</h4>
                                        <div className="space-y-2">
                                        {moment.linkedinCarousel.map((slide: any, j: number) => (
                                            <div key={j} className="text-sm text-foreground/80 p-3 bg-background rounded border border-border">
                                            <span className="font-bold">Slide {slide.slide} ({slide.title}):</span> {slide.content}
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                    )}
                                    </CardContent>
                                </Card>
                                ))}
                            </div>
                        )}
                   </div>
                 ))}
               </div>
            </div>


             <div className="flex flex-col items-center gap-4 pt-6">
                {!allPaid ? (
                  <div className="grid gap-6 md:grid-cols-2 w-full max-w-2xl mx-auto">
                    <Card className="bg-card border-border flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-xl">Lifetime Access</CardTitle>
                        <CardDescription>Pay once, use forever</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between gap-4">
                        <p className="text-3xl font-bold">$49</p>
                        <Button 
                          onClick={() => handlePayment("lifetime")} 
                          disabled={isPaying} 
                          className="w-full bg-background text-foreground border border-border hover:bg-muted"
                        >
                          {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                          Buy Lifetime
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-background border-2 border-primary flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-0.5 text-xs font-bold">BEST VALUE</div>
                      <CardHeader>
                        <CardTitle className="text-xl">Pro Monthly</CardTitle>
                        <CardDescription>5 packs per month</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between gap-4">
                        <p className="text-3xl font-bold">$19<span className="text-sm text-foreground/60">/mo</span></p>
                        <Button 
                          onClick={() => handlePayment("monthly")} 
                          disabled={isPaying} 
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Subscribe & Unlock
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                      {anyProcessing && <p className="text-sm text-foreground/60">Waiting for all videos to complete before download...</p>}
                      <Button 
                        size="lg" 
                        onClick={handleDownload} 
                        disabled={!allCompleted}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Download Batch Content Pack (.zip)
                      </Button>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <AppContent />
    </Suspense>
  );
}
