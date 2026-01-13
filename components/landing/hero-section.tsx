"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play } from "lucide-react"
import { motion } from "framer-motion"

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-25">
      {/* Background Gradient Effect */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px] animate-pulse-glow" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground text-balance text-center sm:text-left lg:text-6xl">
              Master Your Interviews with{" "}
              <span className="bg-gradient-to-r from-accent to-accent/60 bg-clip-text text-transparent">
                AI-Powered
              </span>{" "}
              Practice
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              Practice with realistic AI-driven mock interviews, get instant feedback on your voice and body language,
              and build the confidence to land your dream job.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="group w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="group w-full sm:w-auto bg-transparent">
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Right Content - Demo Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative"
          >
            <div className="animate-float relative rounded-2xl border border-border/50 bg-card/50 p-2 shadow-2xl backdrop-blur-sm">
              <div className="rounded-xl bg-secondary/50 p-6">
                {/* Mock Interview UI */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-destructive/80" />
                    <div className="h-3 w-3 rounded-full bg-warning/80" />
                    <div className="h-3 w-3 rounded-full bg-success/80" />
                  </div>

                  <div className="aspect-video rounded-lg bg-background/50 flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="mx-auto h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-accent/40 flex items-center justify-center">
                          <div className="h-8 w-8 rounded-full bg-accent animate-pulse" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">Recording in progress...</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-background/30 p-4 ">
                    <p className=" text-sm font-medium text-foreground mb-2">Current Question:</p>
                    <p className="text-sm text-muted-foreground">
                      {`"Tell me about a challenging project you've worked on and how you overcame obstacles."`}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 h-2 rounded-full bg-background/50">
                      <div className="h-full w-3/5 rounded-full bg-accent" />
                    </div>
                    <span className="text-xs text-muted-foreground">3/5</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="absolute -left-4 top-1/4 rounded-xl border border-border/50 bg-card p-4 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <span className="text-lg">📈</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">92%</p>
                  <p className="text-xs text-muted-foreground">Confidence Score</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="absolute -right-4 top-2/5 rounded-xl border border-border/50 bg-card p-4 shadow-xl"
            >
              <div className="flex items-center gap-3 text-center ">
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <span className="text-lg">🎯</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">4.8/5</p>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
