import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Server, 
  Cpu, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  HardDrive,
  Users,
  FileQuestion,
  BookOpen,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import SideBar from './SideBar';
import { adminAPI, authAPI } from '../services/api';

function AdminAnalytics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.warn('Logout error', err);
    } finally {
      window.location.href = '/login';
    }
  };

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await adminAPI.getMetrics();
      const data = res.data?.data || res.data;
      setMetrics(data);
      setLastUpdated(new Date().toLocaleTimeString());
      setError('');
    } catch (err) {
      console.error('Failed to load metrics:', err);
      setError(err.response?.data?.message || 'Could not fetch admin system metrics.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // 5-second auto-refresh polling loop
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMetrics();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1F2B] flex items-center justify-center text-[#9AE9FD]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9AE9FD] mx-auto"></div>
          <p className="text-xl font-bold">Querying Telemetry & Distributed State...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1F2B] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <SideBar onLogout={handleLogout} />
      
      <main className="md:ml-64 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header Banner */}
          <div className="bg-[#B8C5C9] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between shadow-xl gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#002732] text-[#9AE9FD] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                <Activity className="w-3.5 h-3.5" /> Production Telemetry
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#002732]">
                System Architecture & Admin Analytics
              </h1>
              <p className="text-[#002732]/80 text-sm font-medium mt-1">
                Real-time observability into Redis caches, BullMQ task queues, MongoDB collections, and Node.js process memory.
              </p>
            </div>

            {/* Refresh Controls */}
            <div className="flex items-center gap-3 shrink-0">
              <label className="flex items-center gap-2 text-xs font-bold text-[#002732] bg-white/60 px-3 py-2 rounded-xl cursor-pointer hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded text-[#002732] focus:ring-0"
                />
                Live Poll (5s)
              </label>

              <button
                onClick={() => fetchMetrics(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-[#002732] hover:bg-[#003848] text-[#9AE9FD] rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Now'}
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Quick Health Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#1E3A47] p-5 rounded-2xl border border-[#2A4A57] flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Health</span>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xl font-black text-emerald-400 capitalize">{metrics?.status || 'Healthy'}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1">Latency: {metrics?.responseTime || '<5ms'}</span>
            </div>

            <div className="bg-[#1E3A47] p-5 rounded-2xl border border-[#2A4A57] flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Process Uptime</span>
              <div className="text-xl font-black text-white mt-2">
                {formatUptime(metrics?.system?.uptimeSeconds)}
              </div>
              <span className="text-[11px] text-cyan-300 mt-1">Node {metrics?.system?.nodeVersion}</span>
            </div>

            <div className="bg-[#1E3A47] p-5 rounded-2xl border border-[#2A4A57] flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Redis Latency</span>
              <div className="text-xl font-black text-[#9AE9FD] mt-2">
                {metrics?.redis?.ping || '1ms'}
              </div>
              <span className="text-[11px] text-emerald-400 mt-1">Status: {metrics?.redis?.status}</span>
            </div>

            <div className="bg-[#1E3A47] p-5 rounded-2xl border border-[#2A4A57] flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Telemetry</span>
              <div className="text-xl font-black text-amber-300 mt-2">
                {lastUpdated || 'Just now'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1">Auto-syncing</span>
            </div>
          </div>

          {/* 4 Deep-Dive Metric Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Panel 1: Redis Distributed Cache & State */}
            <div className="bg-[#1E3A47] p-6 md:p-8 rounded-3xl border border-[#2A4A57] shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Redis Cache & Pub/Sub</h3>
                      <p className="text-xs text-slate-400">Matchmaking queues, ZSET leaderboards, LLM cache</p>
                    </div>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3 py-1 rounded-full">
                    ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-[#0F2933] border border-[#2A4A57]">
                    <span className="text-xs text-slate-400 block mb-1">Memory Footprint</span>
                    <span className="text-2xl font-black text-[#9AE9FD]">{metrics?.redis?.memoryUsed || 'N/A'}</span>
                    <span className="text-[11px] text-slate-500 block mt-1">Allocated human size</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0F2933] border border-[#2A4A57]">
                    <span className="text-xs text-slate-400 block mb-1">Total Keys in Store</span>
                    <span className="text-2xl font-black text-emerald-400">{metrics?.redis?.totalKeys || 0}</span>
                    <span className="text-[11px] text-slate-500 block mt-1">ZSETs, Hashes & TTL strings</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 bg-[#0F2933] p-4 rounded-2xl border border-[#2A4A57]">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Socket.io Redis Adapter:</span>
                  <span className="text-emerald-300 font-semibold">Enabled (Pub/Sub Sync)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Multi-Tier ZSET Keys:</span>
                  <span className="text-cyan-300 font-mono">leaderboard:global, :weekly, :class</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Ping Probe Response:</span>
                  <span className="text-white font-mono font-bold">{metrics?.redis?.ping}</span>
                </div>
              </div>
            </div>

            {/* Panel 2: BullMQ Job Queue */}
            <div className="bg-[#1E3A47] p-6 md:p-8 rounded-3xl border border-[#2A4A57] shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">BullMQ Worker Queue</h3>
                      <p className="text-xs text-slate-400">Async background AI question generation</p>
                    </div>
                  </div>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-1 rounded-full">
                    WORKER READY
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                  <div className="p-3 rounded-2xl bg-[#0F2933] border border-[#2A4A57]">
                    <span className="text-xs text-slate-400 block mb-1">Completed</span>
                    <span className="text-xl font-black text-emerald-400">
                      {metrics?.bullmqQueue?.jobs?.completed || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#0F2933] border border-[#2A4A57]">
                    <span className="text-xs text-slate-400 block mb-1">Active</span>
                    <span className="text-xl font-black text-cyan-400">
                      {metrics?.bullmqQueue?.jobs?.active || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#0F2933] border border-[#2A4A57]">
                    <span className="text-xs text-slate-400 block mb-1">Waiting</span>
                    <span className="text-xl font-black text-amber-400">
                      {metrics?.bullmqQueue?.jobs?.waiting || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 bg-[#0F2933] p-4 rounded-2xl border border-[#2A4A57]">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Queue Name:</span>
                  <span className="text-amber-300 font-mono font-semibold">{metrics?.bullmqQueue?.queueName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Failed / Delayed:</span>
                  <span className="text-slate-300">
                    {metrics?.bullmqQueue?.jobs?.failed || 0} failed / {metrics?.bullmqQueue?.jobs?.delayed || 0} delayed
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Worker Concurrency:</span>
                  <span className="text-emerald-400 font-semibold">5 parallel jobs</span>
                </div>
              </div>
            </div>

            {/* Panel 3: MongoDB Database Clusters */}
            <div className="bg-[#1E3A47] p-6 md:p-8 rounded-3xl border border-[#2A4A57] shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">MongoDB Collections</h3>
                      <p className="text-xs text-slate-400">Persistent user profiles, questions, and RAG knowledge base</p>
                    </div>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3 py-1 rounded-full">
                    {metrics?.database?.mongoConnection === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                  <div className="p-3.5 rounded-2xl bg-[#0F2933] border border-[#2A4A57]">
                    <Users className="w-5 h-5 mx-auto text-[#9AE9FD] mb-1" />
                    <span className="text-xs text-slate-400 block mb-1">Students</span>
                    <span className="text-2xl font-black text-white">{metrics?.database?.totalUsers || 0}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#0F2933] border border-[#2A4A57]">
                    <FileQuestion className="w-5 h-5 mx-auto text-amber-400 mb-1" />
                    <span className="text-xs text-slate-400 block mb-1">Questions</span>
                    <span className="text-2xl font-black text-white">{metrics?.database?.totalPracticeQuestions || 0}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#0F2933] border border-[#2A4A57]">
                    <BookOpen className="w-5 h-5 mx-auto text-cyan-400 mb-1" />
                    <span className="text-xs text-slate-400 block mb-1">RAG Docs</span>
                    <span className="text-2xl font-black text-white">{metrics?.database?.totalCourseDocuments || 0}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 bg-[#0F2933] p-4 rounded-2xl border border-[#2A4A57]">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Connection State:</span>
                  <span className="text-emerald-400 font-semibold">{metrics?.database?.mongoConnection}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Knowledge Base Vector Chunks:</span>
                  <span className="text-[#9AE9FD] font-mono">768-dim indexed in Mongo</span>
                </div>
              </div>
            </div>

            {/* Panel 4: Node.js Runtime & Memory Usage */}
            <div className="bg-[#1E3A47] p-6 md:p-8 rounded-3xl border border-[#2A4A57] shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Process Memory Footprint</h3>
                      <p className="text-xs text-slate-400">V8 garbage collection and memory overhead</p>
                    </div>
                  </div>
                  <span className="bg-[#0F2933] border border-[#2A4A57] text-[#9AE9FD] text-xs font-mono font-bold px-3 py-1 rounded-full">
                    V8 RUNTIME
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                  <div className="p-3.5 rounded-2xl bg-[#0F2933] border border-[#2A4A57]">
                    <span className="text-xs text-slate-400 block mb-1">Heap Used</span>
                    <span className="text-xl font-black text-[#9AE9FD]">{metrics?.system?.heapUsed || '0 MB'}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#0F2933] border border-[#2A4A57]">
                    <span className="text-xs text-slate-400 block mb-1">Heap Total</span>
                    <span className="text-xl font-black text-slate-300">{metrics?.system?.heapTotal || '0 MB'}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#0F2933] border border-[#2A4A57]">
                    <span className="text-xs text-slate-400 block mb-1">RSS Memory</span>
                    <span className="text-xl font-black text-amber-300">{metrics?.system?.rssMemory || '0 MB'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 bg-[#0F2933] p-4 rounded-2xl border border-[#2A4A57]">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Node.js Engine:</span>
                  <span className="text-white font-mono font-bold">{metrics?.system?.nodeVersion}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Raw JSON Endpoint:</span>
                  <a
                    href={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/admin/metrics`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#9AE9FD] hover:underline flex items-center gap-1 font-mono"
                  >
                    /api/admin/metrics <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}

export default AdminAnalytics;
