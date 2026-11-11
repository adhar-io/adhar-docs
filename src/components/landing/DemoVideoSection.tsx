import React, { useRef, useState } from 'react';
import { CheckCircle2, Maximize2, Play, Sparkles, Zap } from 'lucide-react';
import SectionHeader from "./SectionHeader";
import { focusRing } from "./styles";

const VIDEO_ID = '3ckX4UggCvA';

// The player loads only when asked for, with YouTube's control bar off (rel=0
// keeps end-screen suggestions to this channel, iv_load_policy=3 drops
// annotations, playsinline keeps iOS from jumping to its own fullscreen player).
// YouTube's embed options cannot keep its fullscreen button alone, and its
// policies forbid covering any part of the player, so fullscreen is our own
// button outside the frame. The title YouTube shows while paused cannot be
// turned off; before playback the poster below carries no YouTube header.
const PLAYER_SRC = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&controls=0&fs=0&rel=0&iv_load_policy=3&playsinline=1`;

const DemoVideoSection = () => {
  const features = [{
    icon: Zap,
    text: 'One command, any supported cloud',
    color: 'text-primary'
  }, {
    icon: CheckCircle2,
    text: 'SSO, secrets and signing on day one',
    color: 'text-accent'
  }, {
    icon: Sparkles,
    text: 'Self-service, no ticket queue',
    color: 'text-primary'
  }];

  const [playing, setPlaying] = useState(false);
  const [poster, setPoster] = useState(`https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`);
  // iPhone Safari cannot put an element in fullscreen; the button only shows
  // where it works. It renders only after a click, so this never runs on the server.
  const canFullscreen = playing && Boolean(document.fullscreenEnabled);
  const frameRef = useRef<HTMLDivElement>(null);
  const enterFullscreen = () => {
    frameRef.current?.requestFullscreen().catch(() => { /* refused by the browser */ });
  };

  return (
    <section id="demo" aria-labelledby="demo-heading" className="relative section-padding container-padding bg-gradient-to-b from-background to-primary/5 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden>
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-width-content relative z-10">
        {/* Section Header */}
        <SectionHeader id="demo-heading" eyebrow="Platform demo" title="See Adhar" titleMuted="in action.">
          Watch one command take an empty machine to a running platform — GitOps, SSO, secrets, a signed supply chain and the developer console, all wired together.
        </SectionHeader>

        {/* YouTube Video Container */}
        <div className="relative max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border transition-all duration-500 hover:shadow-primary/20">
            <div ref={frameRef} className="aspect-video relative bg-black">
              {playing ? (
                <iframe
                  className="w-full h-full"
                  src={PLAYER_SRC}
                  title="Adhar platform demo"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="autoplay; encrypted-media; picture-in-picture"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label="Play the Adhar platform demo"
                  className={`group absolute inset-0 flex items-center justify-center ${focusRing}`}
                >
                  <img
                    src={poster}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    // YouTube answers a missing maxres frame with a 120px placeholder, not an error.
                    onLoad={(e) => {
                      if (e.currentTarget.naturalWidth < 200) setPoster(`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`);
                    }}
                    className="absolute inset-0 w-full !h-full object-cover"
                  />
                  <span className="absolute inset-0 bg-black/20 transition-colors duration-300 group-hover:bg-black/10" aria-hidden />
                  <span className="relative inline-flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-white/95 text-primary shadow-2xl transition-transform duration-300 group-hover:scale-105">
                    <Play className="h-7 w-7 sm:h-8 sm:w-8 translate-x-0.5 fill-current" aria-hidden />
                  </span>
                </button>
              )}
            </div>
          </div>

          {canFullscreen && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={enterFullscreen}
                className={`inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-muted ${focusRing}`}
              >
                <Maximize2 className="h-4 w-4" aria-hidden />
                Fullscreen
              </button>
            </div>
          )}

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-6 sm:mt-8">
            {features.map((feature) => (
              <div
                key={feature.text}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-background/80 backdrop-blur-sm border border-border/70 rounded-full shadow-[var(--shadow-xs)]"
              >
                <feature.icon className={`w-4 h-4 ${feature.color}`} aria-hidden />
                <span className="text-sm font-medium text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
export default DemoVideoSection;
