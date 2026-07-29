"use client"

import { motion } from "framer-motion"
import { ScanFace, LayoutGrid, FileText, TrendingUp, ShieldCheck, Users } from "lucide-react"

const EQ = [40, 70, 100, 55, 85, 35, 75, 50, 90, 45, 65, 80]

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-[1160px] px-7 pt-5">
      <div className="mx-auto mb-12 max-w-[640px] text-center">
        <div className="mb-3.5 font-mono text-xs uppercase tracking-[0.1em] text-accent">Capabilities</div>
        <h2 className="mb-3.5 font-display text-4xl font-bold tracking-[-0.02em] text-balance">
          One coaching loop. Every signal.
        </h2>
        <p className="text-base text-muted-foreground text-pretty">
          Speech, vision, and language models work together to read the full picture — and tell you
          exactly what to fix.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Big tile */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col rounded-[20px] border border-border bg-gradient-to-br from-accent/[0.09] to-card p-7 sm:col-span-2 lg:row-span-2"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[13px] bg-accent/10 text-accent">
            <ScanFace className="h-[23px] w-[23px]" />
          </div>
          <h3 className="mb-2 font-display text-[22px] font-semibold">Sees and hears everything</h3>
          <p className="mb-5 max-w-[380px] text-[14.5px] leading-relaxed text-muted-foreground">
            Voice and facial models track pace, tone, filler words, eye contact, and posture — the real
            signals interviewers read.
          </p>
          <div className="mt-auto flex flex-col gap-3.5 rounded-[14px] border border-border bg-background/60 p-[18px]">
            <div className="flex h-10 items-end gap-[3px]">
              {EQ.map((h, i) => (
                <span
                  key={i}
                  className="animate-eq-bar flex-1 rounded-[2px] bg-accent"
                  style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
              <div>
                <span className="font-mono text-[15px] text-accent">88%</span> eye contact
              </div>
              <div>
                <span className="font-mono text-[15px] text-accent">142</span> wpm
              </div>
              <div>
                <span className="font-mono text-[15px] text-warning">6</span> fillers
              </div>
            </div>
          </div>
        </motion.div>

        <FeatureTile
          className="sm:col-span-2"
          icon={LayoutGrid}
          title="AI-driven questions"
          body="Tailored to your target role and seniority. The AI adapts in real time and asks the follow-ups a real panel would."
        />
        <FeatureTile icon={FileText} title="Personalized reports" body="Strengths and fixes, ranked." />
        <FeatureTile icon={TrendingUp} title="Progress tracking" body="Trends across every session." />
        <FeatureTile
          className="sm:col-span-2"
          row
          icon={ShieldCheck}
          title="Private & secure"
          body="Sessions are encrypted and yours alone — never shared with employers."
        />
        <FeatureTile
          className="sm:col-span-2"
          row
          icon={Users}
          title="Live human interviews"
          body="Book real interviewers for premium mock sessions — practice with people, not just AI."
        />
      </div>
    </section>
  )
}

function FeatureTile({
  icon: Icon,
  title,
  body,
  className = "",
  row = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  className?: string
  row?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className={`rounded-[20px] border border-border bg-card p-6 transition-colors hover:border-accent/40 ${
        row ? "flex items-center gap-5" : ""
      } ${className}`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-accent/10 text-accent ${
          row ? "" : "mb-3.5"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="mb-1.5 font-display text-base font-semibold">{title}</h3>
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </motion.div>
  )
}
