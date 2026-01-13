// Mock API service - placeholder for backend integration
// TODO: Replace with actual API calls when backend is ready

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
}

export interface InterviewSession {
  id: string
  userId: string
  jobTitle: string
  skills: string[]
  status: "pending" | "in-progress" | "completed"
  score?: number
  feedback?: InterviewFeedback
  createdAt: string
  completedAt?: string
}

export interface InterviewFeedback {
  overallScore: number
  confidenceScore: number
  clarityScore: number
  technicalScore: number
  bodyLanguageScore: number
  voiceToneScore: number
  strengths: string[]
  improvements: string[]
  detailedFeedback: string
}

export interface InterviewQuestion {
  id: string
  question: string
  category: "behavioral" | "technical" | "situational"
  difficulty: "easy" | "medium" | "hard"
}

// Mock data
const mockUser: User = {
  id: "1",
  name: "Alex Johnson",
  email: "alex@example.com",
  avatar: "/professional-avatar.png",
  createdAt: "2024-01-15",
}

const mockSessions: InterviewSession[] = [
  {
    id: "1",
    userId: "1",
    jobTitle: "Senior Frontend Developer",
    skills: ["React", "TypeScript", "Next.js"],
    status: "completed",
    score: 85,
    createdAt: "2024-01-20",
    completedAt: "2024-01-20",
  },
  {
    id: "2",
    userId: "1",
    jobTitle: "Full Stack Engineer",
    skills: ["Node.js", "PostgreSQL", "AWS"],
    status: "completed",
    score: 78,
    createdAt: "2024-01-18",
    completedAt: "2024-01-18",
  },
  {
    id: "3",
    userId: "1",
    jobTitle: "Product Manager",
    skills: ["Agile", "Data Analysis", "Strategy"],
    status: "completed",
    score: 92,
    createdAt: "2024-01-15",
    completedAt: "2024-01-15",
  },
]

const mockQuestions: InterviewQuestion[] = [
  {
    id: "1",
    question:
      "Tell me about a time when you had to work with a difficult team member. How did you handle the situation?",
    category: "behavioral",
    difficulty: "medium",
  },
  {
    id: "2",
    question: "Explain the concept of closures in JavaScript and provide a practical example.",
    category: "technical",
    difficulty: "medium",
  },
  {
    id: "3",
    question: "If you were given a project with an impossible deadline, how would you approach it?",
    category: "situational",
    difficulty: "hard",
  },
  {
    id: "4",
    question: "What is your greatest professional achievement and why?",
    category: "behavioral",
    difficulty: "easy",
  },
  {
    id: "5",
    question: "Describe the difference between REST and GraphQL APIs. When would you choose one over the other?",
    category: "technical",
    difficulty: "hard",
  },
]

// Simulated API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Mock API functions
export const mockApi = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    await delay(800)
    // TODO: Replace with actual authentication
    if (email && password) {
      return { user: mockUser, token: "mock-jwt-token" }
    }
    throw new Error("Invalid credentials")
  },

  async signup(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    await delay(800)
    // TODO: Replace with actual registration
    const newUser = { ...mockUser, name, email, id: Date.now().toString() }
    return { user: newUser, token: "mock-jwt-token" }
  },

  async getCurrentUser(): Promise<User> {
    await delay(300)
    return mockUser
  },

  // Dashboard
  async getDashboardStats(): Promise<{
    totalInterviews: number
    averageScore: number
    confidenceImprovement: number
    recentSessions: InterviewSession[]
  }> {
    await delay(500)
    return {
      totalInterviews: mockSessions.length,
      averageScore: Math.round(mockSessions.reduce((acc, s) => acc + (s.score || 0), 0) / mockSessions.length),
      confidenceImprovement: 23,
      recentSessions: mockSessions.slice(0, 3),
    }
  },

  // Interview
  async startInterview(jobTitle: string, skills: string[], jobDescription: string): Promise<InterviewSession> {
    await delay(600)
    // TODO: Replace with actual interview session creation
    console.log("Starting interview with job description:", jobDescription)
    return {
      id: Date.now().toString(),
      userId: mockUser.id,
      jobTitle,
      skills,
      status: "in-progress",
      createdAt: new Date().toISOString(),
    }
  },

  async getInterviewQuestions(sessionId: string): Promise<InterviewQuestion[]> {
    await delay(400)
    console.log("Fetching questions for session:", sessionId)
    return mockQuestions
  },

  async submitAnswer(sessionId: string, questionId: string, audioBlob?: Blob): Promise<{ success: boolean }> {
    await delay(1000)
    // TODO: Replace with actual answer submission and processing
    console.log("Submitting answer for session:", sessionId, "question:", questionId, "audio:", audioBlob)
    return { success: true }
  },

  async completeInterview(sessionId: string): Promise<InterviewFeedback> {
    await delay(1500)
    // TODO: Replace with actual feedback generation
    console.log("Completing interview:", sessionId)
    return {
      overallScore: 85,
      confidenceScore: 82,
      clarityScore: 88,
      technicalScore: 84,
      bodyLanguageScore: 79,
      voiceToneScore: 86,
      strengths: [
        "Clear and articulate communication",
        "Strong technical knowledge demonstrated",
        "Good use of specific examples",
        "Confident body posture throughout",
      ],
      improvements: [
        "Could provide more detailed follow-up examples",
        "Occasional filler words detected",
        "Eye contact could be more consistent",
      ],
      detailedFeedback:
        "Overall, you demonstrated strong interview skills with clear communication and solid technical knowledge. Your answers were well-structured and showed good understanding of the role requirements. To further improve, focus on reducing filler words and maintaining consistent eye contact with the camera. Consider preparing more specific examples from your experience that directly relate to the job requirements.",
    }
  },
}
