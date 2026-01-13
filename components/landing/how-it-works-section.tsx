"use client"

import { motion } from "framer-motion"

const steps = [
  {
    step: "01",
    title: "Set Up Your Profile",
    description:
      "Enter your target role, skills, and job description. Our AI customizes the interview experience just for you.",
  },
  {
    step: "02",
    title: "Practice with AI",
    description:
      "Engage in realistic mock interviews with our AI interviewer. Answer questions while we analyze your responses.",
  },
  {
    step: "03",
    title: "Get Instant Feedback",
    description:
      "Receive detailed analysis of your performance including voice, body language, and answer quality metrics.",
  },
  {
    step: "04",
    title: "Improve & Repeat",
    description: "Review your personalized improvement plan, practice more, and track your progress over time.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-15 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl mb-4">How it works</h2>
          <p className="max-w-2xl mx-auto text-muted-foreground text-lg">
            Get started in minutes and see improvement after your first session
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
            >
              

              <div className="relative space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent font-mono text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
