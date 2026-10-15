import React, { useState } from 'react';
import { Mail, Github, Linkedin, Send, Sparkles, Code2, Server, Cpu, CheckCircle2 } from 'lucide-react';
function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 4000);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#07131B] text-white">
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-10 lg:py-16">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Creator & Platform Connect
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
              Built with Passion by a Solo Engineer
            </h1>
            <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
              Edventure is an AI-powered, gamified learning platform engineered with distributed Redis state, BullMQ queues, and syllabus RAG copilot.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Creator Profile & Architecture Showcase */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Creator Card */}
              <div className="relative rounded-2xl bg-gradient-to-b from-[#0F2936] to-[#0A1F29] border border-cyan-500/20 p-6 sm:p-8 shadow-xl shadow-black/40">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-cyan-500/20">
                    E
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Lead Engineer & Architect</h3>
                    <p className="text-sm text-cyan-400 font-medium">Edventure Core Platform</p>
                    <p className="text-xs text-gray-400 mt-0.5">Software Engineering Intern Candidate</p>
                  </div>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed mb-6">
                  I architected and built Edventure from scratch as a high-throughput, gamified educational ecosystem featuring real-time multiplayer duels, vector embeddings, and zero-wait matchmaking.
                </p>

                {/* Social Badges */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-gray-300 hover:text-white transition-all text-xs font-semibold"
                  >
                    <Github className="w-4 h-4 text-cyan-400" />
                    GitHub
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-gray-300 hover:text-white transition-all text-xs font-semibold"
                  >
                    <Linkedin className="w-4 h-4 text-cyan-400" />
                    LinkedIn
                  </a>
                  <a
                    href="mailto:contact@edventure.dev"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-gray-300 hover:text-white transition-all text-xs font-semibold"
                  >
                    <Mail className="w-4 h-4 text-cyan-400" />
                    Email
                  </a>
                </div>
              </div>

              {/* System Architecture Highlights Box */}
              <div className="rounded-2xl bg-[#0B1E28] border border-white/10 p-6 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Engineering Highlights
                </h4>
                <div className="space-y-3 text-xs text-gray-300">
                  <div className="flex items-start gap-2.5">
                    <Server className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>Redis Pub/Sub & ZSETs:</strong> Multi-tier weekly & class leaderboards with sub-millisecond lookups.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Code2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>BullMQ Worker:</strong> Non-blocking async AI question generation queue with exponential retries.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>Syllabus RAG:</strong> 768-dim vector embeddings and strict grounding via Gemini 3.8 Flash.</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Interactive Contact & Feedback Form */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl bg-[#0D2430] border border-white/10 p-6 sm:p-10 shadow-xl">
                <h3 className="text-2xl font-bold text-white mb-2">Get in Touch / SDE Opportunities</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Interested in discussing system design, software engineering internships, or feature feedback? Send me a direct message!
                </p>

                {submitted ? (
                  <div className="p-6 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-cyan-400 mx-auto" />
                    <h4 className="text-lg font-bold text-white">Message Dispatched!</h4>
                    <p className="text-sm text-gray-300">
                      Thank you for reaching out. I'll get back to you shortly!
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                          Your Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Recruiter or Student"
                          className="w-full px-4 py-2.5 rounded-xl bg-[#071720] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-400 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                          Your Email
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="name@company.com"
                          className="w-full px-4 py-2.5 rounded-xl bg-[#071720] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-400 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                        Subject
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Internship Inquiry / Platform Feedback"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#071720] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-400 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                        Message
                      </label>
                      <textarea
                        required
                        rows="4"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Write your note or question here..."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#071720] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-400 transition resize-none"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default Contact;
