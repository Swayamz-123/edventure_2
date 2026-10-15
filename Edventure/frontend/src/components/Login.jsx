import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ColoredGoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="21" viewBox="0 0 16 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 16C7.46957 16 6.96086 15.7893 6.58579 15.4142C6.21071 15.0391 6 14.5304 6 14C6 12.89 6.89 12 8 12C8.53043 12 9.03914 12.2107 9.41421 12.5858C9.78929 12.9609 10 13.4696 10 14C10 14.5304 9.78929 15.0391 9.41421 15.4142C9.03914 15.7893 8.53043 16 8 16ZM14 19V9H2V19H14ZM14 7C14.5304 7 15.0391 7.21071 15.4142 7.58579C15.7893 7.96086 16 8.46957 16 9V19C16 19.5304 15.7893 20.0391 15.4142 20.4142C15.0391 20.7893 14.5304 21 14 21H2C1.46957 21 0.960859 20.7893 0.585786 20.4142C0.210714 20.0391 0 19.5304 0 19V9C0 7.89 0.89 7 2 7H3V5C3 3.67392 3.52678 2.40215 4.46447 1.46447C5.40215 0.526784 6.67392 0 8 0C8.65661 0 9.30679 0.129329 9.91342 0.380602C10.52 0.631876 11.0712 1.00017 11.5355 1.46447C11.9998 1.92876 12.3681 2.47995 12.6194 3.08658C12.8707 3.69321 13 4.34339 13 5V7H14ZM8 2C7.20435 2 6.44129 2.31607 5.87868 2.87868C5.31607 3.44129 5 4.20435 5 5V7H11V5C11 4.20435 10.6839 3.44129 10.1213 2.87868C9.55871 2.31607 8.79565 2 8 2Z" fill="#002732"/>
  </svg>
);

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [classLevel, setClassLevel] = useState('10');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [suggestRegister, setSuggestRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/google`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuggestRegister(false);
    setIsLoading(true);

    try {
      if (isRegister) {
        // Register API call
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            class: Number(classLevel) || 10,
          }),
        });
        const data = await response.json();
        if (response.ok) {
          navigate('/dashboard');
        } else {
          setError(data.message || data.error || 'Registration failed');
        }
      } else {
        // Login API call
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password
          }),
        });
        const data = await response.json();
        if (response.ok) {
          navigate('/dashboard');
        } else {
          const errMsg = data.message || data.error || 'Login failed';
          setError(errMsg);
          // If user does not exist, prompt user to register with their entered details
          if (
            response.status === 404 ||
            errMsg.toLowerCase().includes('not exist') ||
            errMsg.toLowerCase().includes('not found')
          ) {
            setSuggestRegister(true);
          }
        }
      }
    } catch (err) {
      setError(isRegister ? 'Registration failed. Check connection.' : 'Login failed. Check connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchToRegister = () => {
    setIsRegister(true);
    setError('');
    setSuggestRegister(false);
  };

  const switchToLogin = () => {
    setIsRegister(false);
    setError('');
    setSuggestRegister(false);
  };

  return (
    <div 
      className="flex items-center justify-center min-h-screen w-full bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(20,78,94,1)_100%)] relative overflow-hidden py-8 px-4"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Background decorative circles */}
      <div className="absolute top-0 left-0 w-full h-full hidden sm:block pointer-events-none">
        <div className="absolute top-[18%] left-[calc(50%+170px)] w-[132px] h-[132px] border-2 border-[#9BE9FD]/80 rounded-full opacity-30"></div>
        <div className="absolute top-[45%] left-[calc(50%-350px)] w-[132px] h-[132px] border-2 border-[#9BE9FD]/80 rounded-full opacity-30"></div>
        <div className="absolute bottom-[12%] left-[calc(50%+200px)] w-[132px] h-[132px] border-2 border-[#9BE9FD]/80 rounded-full opacity-30"></div>
      </div>
      
      <div className="flex flex-col items-center z-10 w-full max-w-[480px]">
        {/* Top Navigation Switcher */}
        <div className="flex items-center p-1 rounded-full bg-[#002732] border border-[#144F5F] mb-6 shadow-lg">
          <button 
            type="button"
            onClick={switchToLogin}
            className={`px-6 sm:px-8 py-2 text-sm sm:text-base font-bold rounded-full transition-all duration-200 ${
              !isRegister 
                ? 'text-white bg-[#144F5F] shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button 
            type="button"
            onClick={switchToRegister}
            className={`px-6 sm:px-8 py-2 text-sm sm:text-base font-bold rounded-full transition-all duration-200 ${
              isRegister 
                ? 'text-white bg-[#144F5F] shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form Container */}
        <div className="relative w-full">
          {/* Layered border glow backdrop */}
          <div className="absolute -top-1 -left-2 w-full h-full bg-white/90 rounded-[40px] sm:rounded-[50px] -z-10 shadow-2xl"></div>
          
          <div className="relative w-full bg-[#001318] rounded-[40px] sm:rounded-[50px] p-6 sm:p-9 flex flex-col justify-center border border-cyan-900/30">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#9AE9FD] text-center mb-1 tracking-wide">
              Edventure
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/70 text-center mb-5">
              {isRegister ? 'Join the gamified learning realm' : 'Welcome back, scholar'}
            </p>

            <form className="flex flex-col w-full gap-y-3 sm:gap-y-3.5" onSubmit={handleSubmit}>
              {/* If in Register mode, ask for Full Name and Grade/Class */}
              {isRegister && (
                <>
                  <div>
                    <label className="text-white text-xs sm:text-sm font-medium mb-1 block">Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Swayam Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-10 bg-[#C4C4C4] px-4 text-black text-sm sm:text-base border-none outline-none rounded-md focus:ring-2 focus:ring-[#9AE9FD]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-white text-xs sm:text-sm font-medium mb-1 block">Class / Grade</label>
                    <select
                      value={classLevel}
                      onChange={(e) => setClassLevel(e.target.value)}
                      className="w-full h-10 bg-[#C4C4C4] px-3 text-black text-sm sm:text-base border-none outline-none rounded-md focus:ring-2 focus:ring-[#9AE9FD]"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Class {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Email Input */}
              <div>
                <label className="text-white text-xs sm:text-sm font-medium mb-1 block">Email</label>
                <input 
                  type="email" 
                  placeholder="scholar@edventure.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 bg-[#C4C4C4] px-4 text-black text-sm sm:text-base border-none outline-none rounded-md focus:ring-2 focus:ring-[#9AE9FD]"
                  required
                />
              </div>

              {/* Password Input */}
              <div>
                <div className="relative">
                  <label className="text-white text-xs sm:text-sm font-medium mb-1 block">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 bg-[#C4C4C4] pl-4 pr-10 text-black text-sm sm:text-base border-none outline-none rounded-md focus:ring-2 focus:ring-[#9AE9FD]"
                    required
                  />
                  <div className="absolute right-3 top-[32px] text-gray-600">
                    <LockIcon />
                  </div>
                </div>
              </div>

              {/* Suggestion banner if user tries to login with un-registered email */}
              {suggestRegister && (
                <div className="bg-cyan-950/90 border border-cyan-400/80 rounded-xl p-3 text-center text-xs sm:text-sm text-cyan-200 mt-1 shadow-lg">
                  <p className="font-semibold text-white mb-1">Account not found with this email.</p>
                  <button
                    type="button"
                    onClick={switchToRegister}
                    className="font-bold text-[#9AE9FD] bg-cyan-900/60 px-3 py-1.5 rounded-lg border border-cyan-400/40 hover:bg-cyan-800 transition"
                  >
                    Click here to Register with these details &rarr;
                  </button>
                </div>
              )}

              {/* Error Message */}
              {error && !suggestRegister && (
                <div className="text-red-400 text-xs sm:text-sm text-center bg-red-950/50 border border-red-500/40 rounded-lg py-2 px-3">
                  {error}
                </div>
              )}

              {/* Main Submit Button */}
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-44 h-10 bg-[#9AE9FD] text-[#002732] font-black text-sm sm:text-base rounded-full self-center mt-2 transition hover:opacity-95 hover:shadow-[0_0_15px_rgba(154,233,253,0.5)] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Processing...' : (isRegister ? 'Register' : 'Login')}
              </button>

              {/* Inline Switch Link */}
              <div className="text-center mt-0.5">
                <button
                  type="button"
                  onClick={() => (isRegister ? switchToLogin() : switchToRegister())}
                  className="text-xs text-cyan-300/80 hover:text-white underline transition cursor-pointer"
                >
                  {isRegister 
                    ? 'Already have an account? Sign In' 
                    : "Don't have an account? Register here"}
                </button>
              </div>
              
              {/* "OR" Divider */}
              <div className="flex items-center gap-x-2 sm:gap-x-4 text-[#9AE9FD] mt-1">
                <div className="h-[1px] w-full bg-[#9BE9FD]/30"></div>
                <span className="text-xs font-semibold">OR</span>
                <div className="h-[1px] w-full bg-[#9BE9FD]/30"></div>
              </div>

              {/* Continue with Google */}
              <button 
                type="button"
                onClick={handleGoogleLogin} 
                className="w-full h-10 bg-[#C4C4C4] rounded-md flex items-center justify-center gap-x-3 text-black font-medium text-xs sm:text-sm transition hover:bg-gray-300 cursor-pointer"
              >
                <ColoredGoogleIcon />
                Continue with Google
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;