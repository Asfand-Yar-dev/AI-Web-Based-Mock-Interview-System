"use client"

import { motion } from "framer-motion"
import { Brain, Mic, Camera, FileText, TrendingUp, Shield } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "AI-Driven Questions",
    description:
      "Intelligent questions tailored to your target role, skills, and experience level. Our AI adapts to challenge you appropriately.",
  },
  {
    icon: Mic,
    title: "Voice Analysis",
    description:
      "Real-time analysis of your speech patterns, pace, filler words, and tone to help you communicate more effectively.",
  },
  {
    icon: Camera,
    title: "Body Language Feedback",
    description:
      "Advanced facial and posture analysis provides insights on eye contact, confidence signals, and professional presence.",
  },
  {
    icon: FileText,
    title: "Personalized Reports",
    description:
      "Comprehensive feedback reports with actionable insights, strengths highlighted, and specific areas for improvement.",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description:
      "Track your improvement over time with detailed analytics, confidence trends, and performance benchmarks.",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description:
      "Your practice sessions and data are encrypted and private. We never share your information with employers.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-15 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl mb-4">
            Everything you need to ace your interviews
          </h2>
          <p className="max-w-2xl mx-auto text-muted-foreground text-lg">
            Our comprehensive platform combines cutting-edge AI technology with proven interview techniques to give you
            the edge.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative rounded-2xl border border-border/50 bg-card/50 p-6 transition-all hover:border-accent/50 hover:bg-card"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
