import React from 'react';
import { 
  Swords, 
  FileText, 
  Trophy, 
  Sparkles, 
  Award, 
  Users, 
  Zap, 
  ShieldCheck, 
  Cpu, 
  ArrowRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    id: 'pvp',
    title: '1v1 Battle Arena & Zero-Wait Matchmaking',
    category: 'Real-Time Multiplayer',
    icon: Swords,
    badgeColor: 'from-amber-500 to-orange-600',
    borderColor: 'hover:border-amber-500/50',
    description: 'Face off against online peers in real-time quiz duels powered by WebSockets. If no player is in queue within 8 seconds, the server automatically spawns an AI Rival with realistic human delay and accuracy.',
    highlights: ['WebSocket state synchronization', 'Simulated AI Ghost Rivals', 'Speed + Accuracy dynamic scoring']
  },
  {
    id: 'rag',
    title: 'Syllabus Vector RAG (PDF to Quiz)',
    category: 'AI & Knowledge Retrieval',
    icon: FileText,
    badgeColor: 'from-cyan-500 to-blue-600',
    borderColor: 'hover:border-cyan-500/50',
    description: 'Upload any textbook, chapter notes, or syllabus PDF. Our backend extracts text, indexes semantic vector embeddings, and synthesizes 5-question multiple choice quizzes grounded strictly in the source text.',
    highlights: ['Cloudinary buffered storage', '768-dim vector embeddings', 'Zero-hallucination source grounding']
  },
  {
    id: 'leaderboard',
    title: 'Multi-Tier Redis Leaderboards',
    category: 'Distributed Systems',
    icon: Trophy,
    badgeColor: 'from-emerald-500 to-teal-600',
    borderColor: 'hover:border-emerald-500/50',
    description: 'Instant ranking lookups in O(log N) time powered by Redis Sorted Sets. Compete in Global All-Time, auto-resetting Weekly Tournaments that refresh every Sunday, or class-segregated grade leaderboards.',
    highlights: ['Redis ZSET partitioning', 'Auto-expiring weekly leagues', 'Class-segregated peer rankings']
  },
  {
    id: 'tutor',
    title: 'ERA: Floating AI Study Copilot',
    category: 'Personalized Learning',
    icon: Sparkles,
    badgeColor: 'from-purple-500 to-indigo-600',
    borderColor: 'hover:border-purple-500/50',
    description: 'An interactive, floating academic tutor accessible from anywhere on the platform. Delivers step-by-step solutions, hints before answers, and caches high-frequency questions in Redis for sub-second responses.',
    highlights: ['Gemini 2.0 conversational engine', 'Redis 1-hour query caching', 'Step-by-step academic explanations']
  },
  {
    id: 'economy',
    title: 'XP Economy & Rewards Shop',
    category: 'Gamification',
    icon: Award,
    badgeColor: 'from-pink-500 to-rose-600',
    borderColor: 'hover:border-pink-500/50',
    description: 'Convert hard-earned victory points into prestigious equippable titles like "Speed Demon", "Grandmaster", and "Code Alchemist", alongside unlockable custom avatars displayed on your profile and arena battles.',
    highlights: ['Equippable custom titles', 'Unlockable hero avatars', 'Daily streak XP multipliers (up to 1.5x)']
  },
  {
    id: 'squad',
    title: 'Squad Network & Peer Socials',
    category: 'Community',
    icon: Users,
    badgeColor: 'from-blue-500 to-sky-600',
    borderColor: 'hover:border-blue-500/50',
    description: 'Search for classmates, add study peers to your custom Squad, track their current streaks and points, and challenge friends directly to fast-paced 1v1 learning face-offs.',
    highlights: ['Live squad connections', 'Peer progress tracking', 'Instant friend search & add']
  }
];

function Features() {
  return (
    <div className="w-full bg-[#05141C] text-white py-16 px-4 sm:px-6 lg:px-8 border-t border-b border-white/5">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-wider uppercase">
            <Zap className="w-3.5 h-3.5" />
            Core Platform Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
            Key Features of Edventure
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Engineered from the ground up as a gamified educational ecosystem blending real-time WebSockets, distributed Redis state, and syllabus vector RAG.
          </p>
        </div>

        {/* 6-Card Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className={`group relative rounded-3xl bg-[#081F2C]/80 border border-[#173748] p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-cyan-950/50 flex flex-col justify-between ${feature.borderColor}`}
              >
                <div>
                  {/* Top Bar with Icon & Category */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${feature.badgeColor} flex items-center justify-center text-white shadow-lg shadow-black/40 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-3 py-1 rounded-full">
                      {feature.category}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-6">
                    {feature.description}
                  </p>
                </div>

                {/* Highlights List */}
                <div className="pt-4 border-t border-white/5 space-y-2">
                  {feature.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action Banner */}
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-[#0C2A3A] via-[#103E50] to-[#0A2230] border border-cyan-500/30 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
              Ready to embark on your learning journey?
            </h3>
            <p className="text-sm text-cyan-200/80 max-w-xl">
              Sign in to earn XP, test your knowledge against real peers, and climb the weekly leaderboards.
            </p>
          </div>
          <Link
            to="/login"
            className="px-8 py-3.5 rounded-2xl bg-[#9AE9FD] text-[#002732] font-black text-base hover:bg-[#7FB3C1] transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-cyan-950/50 shrink-0 flex items-center gap-2"
          >
            <span>Launch Edventure</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Features;
