"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar, CheckCircle, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const mockHistory = [
  {
    id: "1",
    jobTitle: "Senior Frontend Developer",
    skills: ["React", "TypeScript", "Next.js"],
    score: 85,
    date: "2024-01-20",
  },
  {
    id: "2",
    jobTitle: "Full Stack Engineer",
    skills: ["Node.js", "PostgreSQL", "AWS"],
    score: 78,
    date: "2024-01-18",
  },
  {
    id: "3",
    jobTitle: "Product Manager",
    skills: ["Agile", "Data Analysis", "Strategy"],
    score: 92,
    date: "2024-01-15",
  },
  {
    id: "4",
    jobTitle: "UX Designer",
    skills: ["Figma", "User Research", "Prototyping"],
    score: 88,
    date: "2024-01-12",
  },
  {
    id: "5",
    jobTitle: "DevOps Engineer",
    skills: ["Docker", "Kubernetes", "CI/CD"],
    score: 74,
    date: "2024-01-10",
  },
]

export function HistoryContent() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredHistory = mockHistory.filter(
    (session) =>
      session.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold text-foreground">Interview History</h1>
        <p className="text-muted-foreground mt-1">Review your past practice sessions and track your progress</p>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by job title or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-secondary/50 border-border/50"
          />
        </div>
        <Button variant="outline" className="bg-transparent border-border/50">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </motion.div>

      {/* History List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden"
      >
        <div className="divide-y divide-border/50">
          {filteredHistory.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
              className="flex items-center justify-between p-6 transition-colors hover:bg-secondary/30"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <CheckCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">{session.jobTitle}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(session.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{session.skills.join(", ")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-2xl font-bold text-card-foreground">{session.score}%</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
                <Link href={`/interview/results/${session.id}`}>
                  <Button variant="outline" size="sm" className="bg-transparent border-border/50">
                    View Details
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}

          {filteredHistory.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No sessions found matching your search.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
