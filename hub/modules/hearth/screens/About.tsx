"use client";

import { Card, PageTitle } from "@/core/ui";

export function About() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="What this room is" subtitle="And what it can't be, said plainly." />
      <Card>
        <h2 className="sh-h3">What a parent gives, and where this room tries to</h2>
        <ul className="sh-list">
          <li><strong>Being there, without conditions.</strong> A word a day from each chair, never tied to yesterday. Blessings you can read aloud on any day.</li>
          <li><strong>Protection.</strong> The Father&apos;s chair takes your side before it has the whole story. In his eyes says the opposite of what was said about your body.</li>
          <li><strong>Nurture.</strong> Come sit, at the Mother&apos;s Table, is care with nothing to fix: water, food, rest, a hand on your chest.</li>
          <li><strong>Teaching.</strong> What a father teaches, what a mother teaches, the care shelf, for my married daughter, the emotionally available woman. Cards you can read in any order. Nothing is assigned.</li>
          <li><strong>Equipping.</strong> The women who were actually in the text, with the text in front of you.</li>
          <li><strong>Being taken seriously.</strong> What I know holds your wisdom, unedited, ready for when someone asks.</li>
          <li><strong>Reparenting.</strong> The girl and the teenager: rooms where the parents&apos; voices can speak to you at the ages that needed them.</li>
        </ul>
      </Card>
      <Card tone="alt">
        <h2 className="sh-h3">What it can&apos;t be</h2>
        <p>These voices aren&apos;t your parents and they never pretend to be. They will not talk about your real parents, defend them, or analyze them. This room is for what you didn&apos;t get, not for relitigating who didn&apos;t give it.</p>
        <p>Nothing here scores, streaks, or unlocks. Nothing compares you to anyone. Nothing in here comments on your weight or size, ever.</p>
        <p>If anything in here brings up more than you want to carry alone, Need help now is one tap from any page, and a real person, a counselor, a friend, or John, is better than any voice in an app. The voices know that and will say so.</p>
      </Card>
    </div>
  );
}
