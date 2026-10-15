import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from './SideBar';
import { ragAPI, authAPI } from '../services/api';
import {
  FileText,
  HelpCircle,
  Send,
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MessageSquareQuote,
  ChevronRight,
  Bookmark,
  BookOpenCheck
} from 'lucide-react';

// --- Helper Components ---
const Icon = ({ path, className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d={path} />
  </svg>
);

const Spinner = () => (
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9AE9FD] mx-auto"></div>
);

const ICONS = {
  upload: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  check: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  cross: "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  document: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m-1.125 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  brain: "M12 2a9 9 0 00-9 9c0 3.87 2.45 7.17 5.92 8.47.5.09.68-.22.68-.48v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.55 20.17 22 16.87 22 11A9 9 0 0012 2z"
};

const Pdfquiz = () => {
  // Navigation tabs: 'quiz' | 'qa'
  const [activeTab, setActiveTab] = useState('quiz');

  // Documents & Q&A state
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [docsLoading, setDocsLoading] = useState(false);
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState('');
  const [qaHistory, setQaHistory] = useState([]);

  // Quiz generator state
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [subject, setSubject] = useState('Science');
  const [classLevel, setClassLevel] = useState(10);
  const [quizContent, setQuizContent] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle', 'uploading', 'generating', 'quiz', 'finished', 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef(null);

  // Fetch all uploaded syllabus documents
  const fetchDocuments = async () => {
    try {
      setDocsLoading(true);
      const res = await ragAPI.getDocuments();
      const docs = res.data?.data?.documents || [];
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0]._id);
      }
    } catch (err) {
      console.warn('Could not fetch course documents:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Compute total user score based on correct answers
  const score = useMemo(() => {
    if (!quizContent?.questions) return 0;
    return userAnswers.reduce((total, ua, idx) => {
      const q = quizContent.questions[idx];
      if (!q) return total;
      const isCorrect = typeof q.correctAnswer === 'number'
        ? ua.index === q.correctAnswer
        : ua.answer === q.correctAnswer || (q.options && q.options[ua.index] === q.correctAnswer);
      return total + (isCorrect ? (q.points || 10) : 0);
    }, 0);
  }, [userAnswers, quizContent]);

  // Quiz timer effect
  useEffect(() => {
    if (status === 'quiz' && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    } else if (status === 'quiz' && timeLeft === 0) {
      handleNextQuestion(null, -1);
    }
  }, [timeLeft, status]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf'))) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
    } else {
      setError('Please select a valid PDF syllabus or study document.');
      setFile(null);
      setFileName('');
    }
  };

  const resetState = () => {
    setFile(null);
    setFileName('');
    setQuizContent(null);
    setStatus('idle');
    setStatusMessage('');
    setError('');
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setUserAnswers([]);
    setTimeLeft(30);
  };

  // Submit PDF to RAG Backend & Generate Grounded Quiz
  const handleSubmit = async () => {
    if (!file) {
      setError('Please upload a PDF file first.');
      return;
    }

    try {
      setError('');
      setStatus('uploading');
      setStatusMessage('Uploading syllabus to Cloudinary & vectorizing text chunks...');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', fileName.replace(/\.pdf$/i, ''));
      formData.append('subject', subject.toLowerCase());
      formData.append('classLevel', classLevel);
      formData.append('chapter', 'Chapter Study Guide');

      const uploadRes = await ragAPI.uploadDocument(formData);
      const documentId = uploadRes.data?.data?.document?._id;

      if (!documentId) {
        throw new Error('Server did not return a valid document ID.');
      }

      setSelectedDocId(documentId);
      fetchDocuments();

      setStatus('generating');
      setStatusMessage('Synthesizing AI quiz grounded in your document passages...');

      const quizRes = await ragAPI.generateDocumentQuiz(documentId);
      const quizPayload = quizRes.data?.data;

      if (quizPayload && quizPayload.questions && quizPayload.questions.length > 0) {
        setQuizContent({
          title: quizPayload.documentTitle || fileName,
          questions: quizPayload.questions
        });
        setStatus('quiz');
        setTimeLeft(30);
      } else {
        throw new Error('AI could not generate questions from this PDF. Please check if the file has readable text.');
      }
    } catch (err) {
      console.error('RAG Quiz Error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to process PDF.';
      setError(msg);
      setStatus('error');
    }
  };

  const handleAnswerSelect = (option, index) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setTimeout(() => {
      handleNextQuestion(option, index);
    }, 700);
  };

  const handleNextQuestion = async (option, index) => {
    const nextAnswers = [...userAnswers, { answer: option, index }];
    setUserAnswers(nextAnswers);

    if (currentQuestionIndex < quizContent.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setTimeLeft(30);
    } else {
      setStatus('finished');
      // Calculate final points and award to user
      try {
        const finalScore = nextAnswers.reduce((total, ua, idx) => {
          const q = quizContent.questions[idx];
          if (!q) return total;
          const isCorrect = typeof q.correctAnswer === 'number'
            ? ua.index === q.correctAnswer
            : ua.answer === q.correctAnswer || (q.options && q.options[ua.index] === q.correctAnswer);
          return total + (isCorrect ? (q.points || 10) : 0);
        }, 0);
        if (finalScore > 0) {
          await authAPI.updatePoints(finalScore);
        }
      } catch (e) {
        console.warn('Could not sync quiz XP with server:', e);
      }
    }
  };

  const handleLogout = () => {
    authAPI.logout().catch(() => {}).finally(() => {
      window.location.href = '/login';
    });
  };

  // --- Render Views ---
  const renderLoading = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-2rem)] bg-[#0A1F2B]">
      <div className="text-center p-8 bg-[#1E3A47] rounded-3xl border border-[#2A4A57] max-w-md shadow-2xl">
        <Spinner />
        <h3 className="text-xl font-bold mt-6 mb-2 text-[#9AE9FD]">
          {status === 'uploading' ? 'Analyzing Document' : 'Generating RAG Quiz'}
        </h3>
        <p className="text-sm text-slate-300">
          {statusMessage || 'Processing syllabus with vector embeddings and Gemini AI...'}
        </p>
      </div>
    </div>
  );

  const renderIdle = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-2rem)] bg-[#0A1F2B]">
      <div className="w-full max-w-3xl">
        <div className="bg-[#1E3A47] p-8 md:p-10 rounded-3xl border border-[#2A4A57] shadow-2xl mb-6">
          <div className="inline-block bg-[#0F2933] text-[#9AE9FD] px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border border-[#9AE9FD]/20">
            Phase 5 Vector RAG Engine
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#9AE9FD] mb-3">
            Syllabus PDF Quiz Generator
          </h1>
          <p className="text-slate-300 mb-8 leading-relaxed">
            Upload any class syllabus or chapter textbook. Our backend extracts passages, indexes vector chunks, and generates a syllabus-grounded MCQ test with instant scoring.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-[#0F2933] border border-[#2A4A57] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#9AE9FD]"
              >
                <option value="Science">Science / Physics / Chem</option>
                <option value="Mathematics">Mathematics</option>
                <option value="History">History & Social Studies</option>
                <option value="Computer Science">Computer Science</option>
                <option value="General">General Study Notes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Class / Grade Level</label>
              <select
                value={classLevel}
                onChange={(e) => setClassLevel(Number(e.target.value))}
                className="w-full bg-[#0F2933] border border-[#2A4A57] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#9AE9FD]"
              >
                {[6, 7, 8, 9, 10, 11, 12].map(lvl => (
                  <option key={lvl} value={lvl}>Class {lvl}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <label
              htmlFor="file-upload"
              className="group cursor-pointer w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#9AE9FD]/60 hover:border-[#9AE9FD] rounded-2xl bg-[#0F2933] hover:bg-[#0A1F2B] transition-all duration-300"
            >
              <Icon path={ICONS.upload} className="w-16 h-16 text-[#9AE9FD] group-hover:scale-110 transition-transform duration-300" />
              <p className="mt-4 text-slate-200 font-medium">
                {fileName ? (
                  <span className="text-[#9AE9FD] font-semibold">{fileName}</span>
                ) : (
                  'Click or drag & drop syllabus PDF file here'
                )}
              </p>
              <span className="text-xs text-slate-400 mt-1">Supports notes, study guides, worksheets (Max 10MB)</span>
              <input
                id="file-upload"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {error && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file}
              className="w-full font-bold py-4 px-8 rounded-2xl text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] shadow-xl bg-[#9AE9FD] text-[#002732] hover:bg-[#7FB3C1] flex items-center justify-center gap-2"
            >
              <span>🚀</span>
              Generate Grounded Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-2rem)] bg-[#0A1F2B]">
      <div className="w-full max-w-md">
        <div className="bg-[#1E3A47] p-8 rounded-3xl border border-red-500/30 text-center shadow-2xl">
          <Icon path={ICONS.cross} className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#9AE9FD] mb-2">Generation Failed</h2>
          <p className="text-slate-300 text-sm mb-6">{error || 'Something went wrong during quiz creation.'}</p>
          <button
            onClick={resetState}
            className="font-bold py-3 px-8 rounded-2xl text-base transition-all transform hover:scale-105 shadow-lg bg-[#9AE9FD] text-[#002732] hover:bg-[#7FB3C1]"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );

  const renderQuiz = () => {
    if (!quizContent?.questions) return renderError();
    const currentQuestion = quizContent.questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    const correctIndex = typeof currentQuestion.correctAnswer === 'number'
      ? currentQuestion.correctAnswer
      : currentQuestion.options.indexOf(currentQuestion.correctAnswer);

    return (
      <div className="min-h-[calc(100vh-2rem)] bg-[#0A1F2B] text-white p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-[#1E3A47] p-6 rounded-3xl border border-[#2A4A57] shadow mb-6">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#9AE9FD] font-semibold">
                  Grounded in: {quizContent.title}
                </span>
                <h1 className="text-2xl font-bold text-white mt-1">
                  Question {currentQuestionIndex + 1} of {quizContent.questions.length}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#9AE9FD]">{score} XP</div>
                <div className="text-xs text-slate-400">Current Score</div>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="bg-[#1E3A47] p-4 rounded-2xl border border-[#2A4A57] shadow mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-slate-300">Time Remaining</span>
              <span className={`text-xl font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-[#9AE9FD]'}`}>
                {timeLeft}s
              </span>
            </div>
            <div className="w-full bg-[#0F2933] rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-[#9AE9FD]'}`}
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-[#1E3A47] p-6 md:p-8 rounded-3xl border border-[#2A4A57] shadow-xl mb-6">
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-semibold text-white leading-relaxed">
                {currentQuestion.question}
              </h2>
              {currentQuestion.topic && (
                <span className="inline-block mt-3 bg-[#0F2933] text-[#9AE9FD] px-3 py-1 rounded-full text-xs">
                  📌 {currentQuestion.topic}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => {
                let btnStyle = 'bg-[#0F2933] border-[#2A4A57] text-slate-200 hover:border-[#9AE9FD] hover:bg-[#143B4A]';

                if (selectedAnswer !== null) {
                  if (index === correctIndex) {
                    btnStyle = 'bg-emerald-600/90 border-emerald-400 text-white shadow-lg';
                  } else if (selectedAnswer === index) {
                    btnStyle = 'bg-rose-600/90 border-rose-400 text-white shadow-lg';
                  } else {
                    btnStyle = 'bg-[#0F2933] border-[#2A4A57] text-slate-500 opacity-50';
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option, index)}
                    disabled={selectedAnswer !== null}
                    className={`p-4 rounded-2xl text-left font-medium border transition-all duration-200 flex items-center gap-3 ${btnStyle}`}
                  >
                    <span className="w-8 h-8 rounded-xl bg-black/30 flex items-center justify-center font-bold text-sm text-[#9AE9FD] shrink-0">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                  </button>
                );
              })}
            </div>

            {selectedAnswer !== null && currentQuestion.explanation && (
              <div className="mt-6 p-4 rounded-xl bg-[#0F2933] border border-[#2A4A57] text-slate-300 text-sm">
                <span className="font-semibold text-[#9AE9FD]">💡 Explanation: </span>
                {currentQuestion.explanation}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFinished = () => (
    <div className="min-h-[calc(100vh-2rem)] bg-[#0A1F2B] p-4 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1E3A47] p-8 md:p-10 rounded-3xl border border-[#2A4A57] shadow-2xl text-center mb-8">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-3xl font-extrabold text-[#9AE9FD] mb-2">Quiz Completed!</h1>
          <p className="text-slate-300 mb-6">
            Grounded assessment generated from <span className="text-[#9AE9FD] font-semibold">{quizContent?.title}</span>
          </p>

          <div className="inline-flex items-center gap-6 bg-[#0F2933] border border-[#2A4A57] px-8 py-4 rounded-2xl mb-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400">Total Score</div>
              <div className="text-3xl font-black text-[#9AE9FD]">{score} XP</div>
            </div>
            <div className="w-px h-10 bg-[#2A4A57]"></div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400">Correct Answers</div>
              <div className="text-3xl font-black text-emerald-400">
                {userAnswers.filter((ua, idx) => {
                  const q = quizContent.questions[idx];
                  if (!q) return false;
                  return typeof q.correctAnswer === 'number'
                    ? ua.index === q.correctAnswer
                    : ua.answer === q.correctAnswer || (q.options && q.options[ua.index] === q.correctAnswer);
                }).length} / {quizContent.questions.length}
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={resetState}
              className="bg-[#9AE9FD] text-[#002732] px-6 py-3 rounded-2xl hover:bg-[#7FB3C1] font-bold transition-all transform hover:scale-105"
            >
              Upload Another PDF
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-[#0F2933] border border-[#2A4A57] text-white px-6 py-3 rounded-2xl hover:bg-[#143B4A] font-bold transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Detailed Review */}
        <div className="bg-[#1E3A47] p-6 md:p-8 rounded-3xl border border-[#2A4A57] shadow">
          <h2 className="text-xl font-bold mb-6 text-[#9AE9FD]">Detailed Question Review</h2>
          <div className="space-y-4">
            {quizContent.questions.map((question, index) => {
              const userAnswer = userAnswers[index];
              const correctIndex = typeof question.correctAnswer === 'number'
                ? question.correctAnswer
                : question.options.indexOf(question.correctAnswer);
              const isCorrect = typeof question.correctAnswer === 'number'
                ? userAnswer?.index === question.correctAnswer
                : userAnswer?.answer === question.correctAnswer || (question.options && question.options[userAnswer?.index] === question.correctAnswer);

              return (
                <div key={index} className="border border-[#2A4A57] rounded-2xl p-5 bg-[#0F2933]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Question {index + 1}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {isCorrect ? '✓ Correct (+10 XP)' : '✗ Incorrect (0 XP)'}
                    </span>
                  </div>
                  <h4 className="text-white font-medium mb-3">{question.question}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                      <span className="text-xs text-slate-400 block mb-1">Your Selected Option:</span>
                      <span className={isCorrect ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {userAnswer?.answer || (userAnswer?.index >= 0 ? question.options[userAnswer.index] : 'Timed out')}
                      </span>
                    </div>
                    {!isCorrect && (
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                        <span className="text-xs text-emerald-400 block mb-1">Correct Answer:</span>
                        <span className="text-emerald-300 font-semibold">
                          {correctIndex >= 0 ? question.options[correctIndex] : question.correctAnswer}
                        </span>
                      </div>
                    )}
                  </div>
                  {question.explanation && (
                    <p className="text-xs text-slate-400 mt-3 italic">
                      💡 {question.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // Submit question to RAG Syllabus Copilot
  const handleAskQuestion = async (customQ) => {
    const q = (typeof customQ === 'string' ? customQ : qaQuestion).trim();
    if (!q) return;

    const currentDoc = documents.find(d => d._id === selectedDocId);

    setQaLoading(true);
    setQaError('');
    try {
      const res = await ragAPI.askCopilot(
        q,
        currentDoc?.subject || subject,
        currentDoc?.classLevel || classLevel,
        selectedDocId || undefined
      );

      const payload = res.data?.data;
      if (payload) {
        setQaHistory(prev => [
          {
            id: Date.now(),
            question: q,
            answer: payload.answer,
            citations: payload.citations || [],
            chunksRetrieved: payload.chunksRetrieved || 0,
            docTitle: currentDoc?.title || 'Syllabus Document',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          ...prev
        ]);
        setQaQuestion('');
      }
    } catch (err) {
      console.error('QA Error:', err);
      setQaError(err.response?.data?.message || err.message || 'Failed to answer question from document.');
    } finally {
      setQaLoading(false);
    }
  };

  const renderQA = () => {
    const selectedDoc = documents.find(d => d._id === selectedDocId);

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Document Selection Banner */}
        <div className="bg-[#1E3A47] p-6 md:p-8 rounded-3xl border border-[#2A4A57] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/5">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#0F2933] text-[#9AE9FD] px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border border-[#9AE9FD]/20">
                <Sparkles className="w-3.5 h-3.5" />
                Syllabus Copilot • RAG Engine
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                Ask Questions from Uploaded PDF
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Select any uploaded syllabus notes or textbook. Every answer is strictly grounded with page-number citations.
              </p>
            </div>
            
            <button
              onClick={() => setActiveTab('quiz')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F2933] hover:bg-[#143B4A] border border-[#2A4A57] text-[#9AE9FD] text-xs font-bold transition-all shrink-0"
            >
              <FileText className="w-4 h-4" />
              Upload New PDF
            </button>
          </div>

          {/* Document Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#9AE9FD]" />
                Select Uploaded Document:
              </label>
              <button
                onClick={fetchDocuments}
                className="text-xs text-slate-400 hover:text-[#9AE9FD] flex items-center gap-1 transition"
                title="Refresh documents list"
              >
                <RefreshCw className={`w-3 h-3 ${docsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#0F2933] border border-dashed border-[#2A4A57] text-center">
                <FileText className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-300 font-medium">No documents uploaded yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Upload your syllabus PDF to enable vector semantic search & question answering.</p>
                <button
                  onClick={() => setActiveTab('quiz')}
                  className="bg-[#9AE9FD] text-[#002732] font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#7FB3C1] transition"
                >
                  Upload First PDF
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full bg-[#0F2933] border border-[#2A4A57] rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#9AE9FD] transition"
                >
                  {documents.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.title} — {doc.subject?.toUpperCase()} (Class {doc.classLevel}) • {doc.totalPages || 1} pages
                    </option>
                  ))}
                </select>

                {selectedDoc && (
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[#0F2933]/60 border border-white/5 text-xs text-slate-300">
                    <span className="font-semibold text-white">Active:</span>
                    <span className="text-[#9AE9FD] font-mono font-bold">{selectedDoc.title}</span>
                    <span className="text-slate-500">•</span>
                    <span className="bg-[#1E3A47] px-2 py-0.5 rounded text-slate-300 capitalize">{selectedDoc.subject}</span>
                    <span className="bg-[#1E3A47] px-2 py-0.5 rounded text-slate-300">Class {selectedDoc.classLevel}</span>
                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
                      {selectedDoc.totalChunks || 'Multiple'} Semantic Chunks Indexed
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips */}
          {documents.length > 0 && (
            <div className="mt-5 pt-5 border-t border-white/5">
              <span className="text-xs text-slate-400 block mb-2 font-medium">Quick Prompt Ideas:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  "What are the core concepts covered in this document?",
                  "List the most important formulas and definitions",
                  "What questions might appear on an exam from this topic?",
                  "Give me a concise 3-point chapter summary"
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQaQuestion(prompt);
                      handleAskQuestion(prompt);
                    }}
                    disabled={qaLoading}
                    className="text-xs bg-[#0F2933] hover:bg-[#143B4A] hover:border-[#9AE9FD]/50 text-slate-300 hover:text-white border border-[#2A4A57] px-3 py-1.5 rounded-full transition disabled:opacity-50 text-left"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question Input Form */}
          {documents.length > 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion();
              }}
              className="mt-6 flex gap-3"
            >
              <input
                type="text"
                value={qaQuestion}
                onChange={(e) => setQaQuestion(e.target.value)}
                placeholder="Ask any question from this uploaded PDF..."
                disabled={qaLoading}
                className="flex-1 bg-[#0F2933] border border-[#2A4A57] rounded-2xl px-5 py-3.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#9AE9FD] transition"
              />
              <button
                type="submit"
                disabled={qaLoading || !qaQuestion.trim()}
                className="bg-[#9AE9FD] text-[#002732] font-bold px-6 py-3.5 rounded-2xl hover:bg-[#7FB3C1] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 shadow-lg"
              >
                {qaLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Ask Copilot
                  </>
                )}
              </button>
            </form>
          )}

          {qaError && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{qaError}</span>
            </div>
          )}
        </div>

        {/* Q&A Response Stream */}
        {qaHistory.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MessageSquareQuote className="w-4 h-4 text-[#9AE9FD]" />
              Document Answers & Citations ({qaHistory.length})
            </h3>

            {qaHistory.map((item) => (
              <div key={item.id} className="bg-[#1E3A47] p-6 rounded-3xl border border-[#2A4A57] shadow-xl space-y-4">
                {/* Question */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-[#9AE9FD]/20 text-[#9AE9FD] border border-[#9AE9FD]/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      Q
                    </span>
                    <h4 className="text-base font-bold text-white">{item.question}</h4>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">{item.timestamp}</span>
                </div>

                {/* Grounded Answer */}
                <div className="p-5 rounded-2xl bg-[#0F2933] border border-[#2A4A57] text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {item.answer}
                </div>

                {/* Citations Panel */}
                {item.citations && item.citations.length > 0 && (
                  <div className="pt-2 border-t border-white/5">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                      Grounded Source Passages:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.citations.map((cite, cIdx) => (
                        <div
                          key={cIdx}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0A1F2B] border border-cyan-500/30 text-xs text-slate-300"
                        >
                          <span className="text-[#9AE9FD] font-bold">📄 Page {cite.pageNumber}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-emerald-400 font-semibold">{cite.relevanceScore}% match</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (status) {
      case 'uploading':
      case 'generating':
        return renderLoading();
      case 'idle':
        return renderIdle();
      case 'error':
        return renderError();
      case 'quiz':
        return renderQuiz();
      case 'finished':
        return renderFinished();
      default:
        return renderIdle();
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1F2B] flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Tab Switcher */}
          {status === 'idle' && (
            <div className="flex justify-center mb-6">
              <div className="inline-flex bg-[#1E3A47] p-1.5 rounded-2xl border border-[#2A4A57] shadow-xl">
                <button
                  onClick={() => setActiveTab('quiz')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'quiz'
                      ? 'bg-[#9AE9FD] text-[#002732] shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <BookOpenCheck className="w-4 h-4" />
                  PDF Quiz Generator
                </button>
                <button
                  onClick={() => {
                    setActiveTab('qa');
                    fetchDocuments();
                  }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'qa'
                      ? 'bg-[#9AE9FD] text-[#002732] shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <MessageSquareQuote className="w-4 h-4" />
                  Ask Document AI (Copilot)
                  {documents.length > 0 && (
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-400/30">
                      {documents.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Render Active View */}
          {status === 'idle' && activeTab === 'qa' ? renderQA() : renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Pdfquiz;