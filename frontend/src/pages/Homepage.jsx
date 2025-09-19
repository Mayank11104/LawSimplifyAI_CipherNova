import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Star, CheckCircle } from 'lucide-react';
import homepageAnimation from '@/assets/homepage/homepageanimation.gif';
import { useNavigate } from "react-router-dom";

const Homepage = ({ theme,authError, onGetStartedClick }) => {
  // State and refs for the How It Works section
  const [visibleSteps, setVisibleSteps] = useState(new Set());
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const stepRefs = useRef([]);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const animationTimeouts = useRef([]);
  const animationIntervalRef = useRef(null);
  const handleGetStarted = () => {
    try {
      console.log("Get started clicked");
  
      const user = localStorage.getItem("user");
      if (user) {
        // user already logged in → skip auth modal
        console.log("User found in localStorage:", JSON.parse(user));
        navigate("/clausemain");
        // you can redirect or show dashboard here
        return;
      }
  
      // no user → open auth modal
      onGetStartedClick();
  
    } catch (error) {
      console.error("Get started error:", error);
    }
  };

  const steps = [
    {
      number: '1',
      title: 'Upload Your Document',
      description: 'Securely upload your legal document in formats like PDF, DOCX, or plain text.',
    },
    {
      number: '2',
      title: 'AI Simplification',
      description:
        'Our advanced AI analyzes your document, breaking down complex clauses into plain, easy-to-understand language.',
    },
    {
      number: '3',
      title: 'Get Instant Insights',
      description:
        'Receive a clear summary, clause-by-clause explanations, and the ability to ask questions to clarify any point.',
    },
  ];

  // Clear all timeouts and intervals
  const clearAnimationTimeouts = useCallback(() => {
    animationTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    animationTimeouts.current = [];

    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
  }, []);

  // Reset animation state
  const resetAnimationState = useCallback(() => {
    clearAnimationTimeouts();
    setVisibleSteps(new Set());
    setAnimationPhase(0);
    setShowSuccess(false);
  }, [clearAnimationTimeouts]);

  // Start animation sequence
  const startAnimationSequence = useCallback(() => {
    clearAnimationTimeouts();

    // Reset first
    setAnimationPhase(0);
    setShowSuccess(false);

    // Start the repeating animation cycle
    const runAnimationCycle = () => {
      // Phase 1: Flow from 1 to 2 (blue/purple)
      const phase1Timeout = setTimeout(() => {
        setAnimationPhase(1);
      }, 500);
      animationTimeouts.current.push(phase1Timeout);

      // Phase 2: Flow from 2 to 3 (green)
      const phase2Timeout = setTimeout(() => {
        setAnimationPhase(2);
      }, 2500);
      animationTimeouts.current.push(phase2Timeout);

      // Phase 3: Show success
      const phase3Timeout = setTimeout(() => {
        setAnimationPhase(3);
        setShowSuccess(true);
      }, 4500);
      animationTimeouts.current.push(phase3Timeout);

      // Phase 4: Reset and prepare for next cycle
      const resetTimeout = setTimeout(() => {
        setShowSuccess(false);
        setAnimationPhase(0);
      }, 6000);
      animationTimeouts.current.push(resetTimeout);
    };

    // Run first cycle immediately
    runAnimationCycle();

    // Set up repeating cycle
    animationIntervalRef.current = setInterval(() => {
      if (isInView) {
        runAnimationCycle();
      }
    }, 7000); // Total cycle time
  }, [isInView]);

  // Intersection Observer for section visibility
  useEffect(() => {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === sectionRef.current) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
              // Section is coming into view
              if (!isInView) {
                setIsInView(true);
              }
            } else {
              // Section is going out of view
              if (isInView) {
                setIsInView(false);
                resetAnimationState();
              }
            }
          }
        });
      },
      {
        threshold: [0, 0.3, 0.7],
        rootMargin: '-10% 0px -10% 0px',
      },
    );

    if (sectionRef.current) {
      sectionObserver.observe(sectionRef.current);
    }

    return () => {
      sectionObserver.disconnect();
      clearAnimationTimeouts();
    };
  }, [isInView, resetAnimationState, clearAnimationTimeouts]);

  // Intersection Observer for individual steps
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stepIndex = parseInt(entry.target.dataset.stepIndex);
            setVisibleSteps((prev) => new Set([...prev, stepIndex]));
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '-50px 0px',
      },
    );

    stepRefs.current.forEach((ref, index) => {
      if (ref) {
        ref.dataset.stepIndex = index;
        observer.observe(ref);
      }
    });

    return () => observer.disconnect();
  }, []);

  // Start animation when all steps are visible and section is in view
  useEffect(() => {
    if (visibleSteps.size === 3 && isInView) {
      // Small delay to ensure smooth transition
      const startTimeout = setTimeout(() => {
        startAnimationSequence();
      }, 500);

      return () => clearTimeout(startTimeout);
    }
  }, [visibleSteps, isInView, startAnimationSequence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAnimationTimeouts();
    };
  }, [clearAnimationTimeouts]);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#222831] text-white' : 'bg-[#FDFAF6]/95 text-gray-900'
      }`}
    >
      {authError && (
  <div className="mb-6 p-4 rounded bg-red-100 text-red-700 border border-red-300 text-center">
    {authError}
  </div>
)}
      {/* Hero Section */}
      <section id="home" className="pt-0 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-8xl mx-auto pl-10 pr-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[600px]">
            {/* Left Side - Text Content */}
            <div className="space-y-8">
              <h1
                className={`text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                Build Something
                <span className={`block ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                  Amazing
                </span>
              </h1>
              <p
                className={`text-xl sm:text-2xl leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Transform your ideas into reality with our cutting-edge platform. Fast, reliable,
                and built for the future.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGetStarted}
                  // onClick={onGetStartedClick}
                  className={`px-8 py-4 text-lg font-medium rounded-lg transition-all duration-200 hover:scale-105 flex items-center justify-center ${
                    theme === 'dark'
                      ? 'bg-[#FDFAF6]/95 text-[#323949] hover:white shadow-lg hover:shadow-blue-500/25'
                      : 'bg-[#323949] text-white hover:bg-[#323949] shadow-lg hover:shadow-blue-500/25'
                  }`}
                >
                  Get Started <ArrowRight className="ml-2" size={20} />
                </button>
                <button
                  className={`px-8 py-4 text-lg font-medium rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:border-white hover:text-white hover:bg-gray-800'
                      : 'border-gray-400 text-gray-700 hover:border-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Learn More
                </button>
              </div>
            </div>

            {/* Right Side - Image */}
            <div className="relative">
              <div
                className={`rounded-2xl overflow-hidden shadow-2xl transition-transform duration-300 hover:scale-105 ${
                  theme === 'dark' ? 'shadow-gray-900/50' : 'shadow-gray-500/20'
                }`}
              >
                <img
                  src={homepageAnimation}
                  alt="Text Summarization Illustration"
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Decorative Elements */}
              <div
                className={`absolute -top-4 -right-4 w-24 h-24 rounded-full blur-xl ${
                  theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-500/10'
                }`}
              ></div>
              <div
                className={`absolute -bottom-4 -left-4 w-32 h-32 rounded-full blur-xl ${
                  theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-500/10'
                }`}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className={`py-20 md:py-28 ${theme === 'dark' ? 'bg-[#222831]' : 'bg-[#FDFAF6]/95'}`}
      >
        <div className="container mx-auto px-6 lg:px-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1
              className={`text-3xl md:text-6xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              Powerful Features to Demystify Legal Jargon
            </h1>
            <p
              className={`text-lg md:text-xl mt-4 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              LegalEase AI offers a suite of tools designed to bring clarity and confidence to your
              legal document reviews.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 1 - Upload & Summarize */}
            <div className="relative group cursor-pointer transition-all duration-500 hover:scale-105 flex flex-col items-start text-left">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 rounded-xl blur-sm opacity-75 group-hover:opacity-100 transition-all duration-500 group-hover:duration-300 animate-gradient-x"></div>
              <div
                className={`relative p-6 rounded-xl transition-all duration-500 ${
                  theme === 'dark'
                    ? 'bg-black group-hover:bg-gray-750'
                    : 'bg-white group-hover:bg-gray-50'
                } ring-1 ring-gray-900/5 group-hover:shadow-2xl group-hover:shadow-pink-500/10`}
              >
                <div
                  className={`p-3 rounded-lg mb-4 transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-blue-500/10 group-hover:bg-blue-500/20'
                      : 'bg-blue-500/10 group-hover:bg-blue-500/20'
                  }`}
                >
                  <svg
                    className={`transition-all duration-300 ${
                      theme === 'dark'
                        ? 'text-blue-400 group-hover:text-blue-300'
                        : 'text-blue-600 group-hover:text-blue-700'
                    } group-hover:scale-110`}
                    fill="currentColor"
                    height="32"
                    viewBox="0 0 256 256"
                    width="32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z" />
                  </svg>
                </div>
                <h3
                  className={`text-xl font-bold mb-2 transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'text-white group-hover:text-pink-300'
                      : 'text-gray-900 group-hover:text-pink-600'
                  }`}
                >
                  Upload & Summarize
                </h3>
                <p
                  className={`transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'text-gray-400 group-hover:text-gray-300'
                      : 'text-gray-600 group-hover:text-gray-700'
                  }`}
                >
                  Quickly upload contracts and get a concise summary of key terms and obligations.
                </p>
              </div>
            </div>

            {/* Card 2 - Clause-by-Clause Explanation */}
            <div className="relative group cursor-pointer transition-all duration-500 hover:scale-105 flex flex-col items-start text-left">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 rounded-xl blur-sm opacity-75 group-hover:opacity-100 transition-all duration-500 group-hover:duration-300 animate-gradient-x"></div>
              <div
                className={`relative p-6 rounded-xl transition-all duration-500 ${
                  theme === 'dark'
                    ? 'bg-black group-hover:bg-gray-750'
                    : 'bg-white group-hover:bg-gray-50'
                } ring-1 ring-gray-900/5 group-hover:shadow-2xl group-hover:shadow-blue-500/10`}
              >
                <div
                  className={`p-3 rounded-lg mb-4 transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-green-500/10 group-hover:bg-green-500/20'
                      : 'bg-green-500/10 group-hover:bg-green-500/20'
                  }`}
                >
                  <svg
                    className={`transition-all duration-300 ${
                      theme === 'dark'
                        ? 'text-green-400 group-hover:text-green-300'
                        : 'text-green-600 group-hover:text-green-700'
                    } group-hover:scale-110`}
                    fill="currentColor"
                    height="32"
                    viewBox="0 0 256 256"
                    width="32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M224,48H32a8,8,0,0,0-8,8V192a8,8,0,0,0,8,8H224a8,8,0,0,0,8-8V56A8,8,0,0,0,224,48ZM95.42,168L40,128.32,51.68,112,94.23,143.2l111.82-80L216,77.56Z" />
                  </svg>
                </div>
                <h3
                  className={`text-xl font-bold mb-2 transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'text-white group-hover:text-cyan-300'
                      : 'text-gray-900 group-hover:text-cyan-600'
                  }`}
                >
                  Clause-by-Clause Explanation
                </h3>
                <p
                  className={`transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'text-gray-400 group-hover:text-gray-300'
                      : 'text-gray-600 group-hover:text-gray-700'
                  }`}
                >
                  Get a detailed breakdown of each clause, explaining its meaning and implications.
                </p>
              </div>
            </div>

            {/* Card 3 - Ask Questions in English */}
            <div className="relative group cursor-pointer transition-all duration-500 hover:scale-105 flex flex-col items-start text-left">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-yellow-600 to-orange-600 rounded-xl blur-sm opacity-75 group-hover:opacity-100 transition-all duration-500 group-hover:duration-300 animate-gradient-x"></div>
              <div
                className={`relative p-6 rounded-xl transition-all duration-500 ${
                  theme === 'dark'
                    ? 'bg-black group-hover:bg-gray-750'
                    : 'bg-white group-hover:bg-gray-50'
                } ring-1 ring-gray-900/5 group-hover:shadow-2xl group-hover:shadow-orange-500/10`}
              >
                <div
                  className={`p-3 rounded-lg mb-4 transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-blue-500/10 group-hover:bg-yellow-500/20'
                      : 'bg-blue-500/10 group-hover:bg-yellow-500/20'
                  }`}
                >
                  <svg
                    className={`transition-all duration-300 ${
                      theme === 'dark'
                        ? 'text-blue-400 group-hover:text-yellow-300'
                        : 'text-blue-600 group-hover:text-orange-600'
                    } group-hover:scale-110`}
                    fill="currentColor"
                    height="32"
                    viewBox="0 0 256 256"
                    width="32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" />
                  </svg>
                </div>
                <h3
                  className={`text-xl font-bold mb-2 transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'text-white group-hover:text-yellow-300'
                      : 'text-gray-900 group-hover:text-orange-600'
                  }`}
                >
                  Ask Questions in English
                </h3>
                <p
                  className={`transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'text-gray-400 group-hover:text-gray-300'
                      : 'text-gray-600 group-hover:text-gray-700'
                  }`}
                >
                  Ask specific questions about the document and receive clear, AI-powered answers.
                </p>
              </div>
            </div>

            {/* Card 4 - Private & Secure */}
            <div className="relative group cursor-pointer transition-all duration-500 hover:scale-105 flex flex-col items-start text-left">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-600 via-blue-600 to-green-600 rounded-xl blur-sm opacity-75 group-hover:opacity-100 transition-all duration-500 group-hover:duration-300 animate-gradient-x"></div>
              <div
                className={`relative p-6 rounded-xl transition-all duration-500 ${
                  theme === 'dark'
                    ? 'bg-black group-hover:bg-gray-750'
                    : 'bg-white group-hover:bg-gray-50'
                } ring-1 ring-gray-900/5 group-hover:shadow-2xl group-hover:shadow-green-500/10`}
              >
                <div
                  className={`p-3 rounded-lg mb-4 transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-green-500/10 group-hover:bg-green-500/20'
                      : 'bg-green-500/10 group-hover:bg-green-500/20'
                  }`}
                >
                  <svg
                    className={`transition-all duration-300 ${
                      theme === 'dark'
                        ? 'text-green-400 group-hover:text-green-300'
                        : 'text-green-600 group-hover:text-green-700'
                    } group-hover:scale-110`}
                    fill="currentColor"
                    height="32"
                    viewBox="0 0 256 256"
                    width="32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M208,40H48A16,16,0,0,0,32,56v58.77c0,89.61,75.82,119.34,91,124.39a15.53,15.53,0,0,0,10,0c15.2-5.05,91-34.78,91-124.39V56A16,16,0,0,0,208,40Zm0,74.79c0,78.42-66.35,104.62-80,109.18-13.53-4.51-80-30.69-80-109.18V56l160,0Z" />
                  </svg>
                </div>
                <h3
                  className={`text-xl font-bold mb-2 transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'text-white group-hover:text-green-300'
                      : 'text-gray-900 group-hover:text-green-600'
                  }`}
                >
                  Private & Secure
                </h3>
                <p
                  className={`transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'text-gray-400 group-hover:text-gray-300'
                      : 'text-gray-600 group-hover:text-gray-700'
                  }`}
                >
                  Your documents are protected in our secure AI environment, ensuring
                  confidentiality.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Animated How It Works Section */}
      <section
        ref={sectionRef}
        id="how-it-works"
        className={`py-15 md:py-22 overflow-hidden ${theme === 'dark' ? 'bg-[#222831]' : 'bg-[#FDFAF6]/95'}`}
      >
        <div className="container mx-auto px-6 lg:px-10">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2
              className={`text-3xl md:text-4xl font-bold leading-tight tracking-tighter ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              How It Works in 3 Simple Steps
            </h2>
            <p
              className={`text-lg md:text-xl mt-4 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Get from complex legal document to clear understanding in minutes.
            </p>
          </div>

          {/* Animated Timeline */}
          <div className="relative max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div
                key={step.number}
                ref={(el) => (stepRefs.current[index] = el)}
                className={`timeline-item relative pl-12 group transition-all duration-700 ease-out ${
                  index < steps.length - 1 ? 'pb-12' : ''
                } ${
                  visibleSteps.has(index) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`}
                style={{
                  transitionDelay: `${index * 200}ms`,
                }}
              >
                {/* Animated Timeline Line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-5 top-12 bottom-0 w-1 overflow-hidden">
                    {/* Base line */}
                    <div
                      className={`absolute inset-0 transition-all duration-300 ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                      }`}
                    />

                    {/* Flow animation line 1 to 2 */}
                    {index === 0 && (
                      <div
                        className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-blue-500 via-purple-500 to-blue-500 transition-all duration-2000 ease-out ${
                          animationPhase === 1 ? 'h-full opacity-80' : 'h-0 opacity-0'
                        }`}
                        style={{
                          background: 'linear-gradient(to bottom, #3b82f6, #8b5cf6, #3b82f6)',
                          boxShadow:
                            animationPhase === 1 ? '0 0 20px rgba(139, 92, 246, 0.6)' : 'none',
                          transformOrigin: 'top',
                        }}
                      />
                    )}

                    {/* Flow animation line 2 to 3 */}
                    {index === 1 && (
                      <div
                        className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-green-400 via-emerald-500 to-green-600 transition-all duration-2000 ease-out ${
                          animationPhase === 2 ? 'h-full opacity-80' : 'h-0 opacity-0'
                        }`}
                        style={{
                          background: 'linear-gradient(to bottom, #22c55e, #10b981, #16a34a)',
                          boxShadow:
                            animationPhase === 2 ? '0 0 20px rgba(34, 197, 94, 0.6)' : 'none',
                          transformOrigin: 'top',
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Animated Step Circle */}
                <div
                  className={`absolute left-0 top-0 flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg z-10 transform transition-all duration-500 ${
                    visibleSteps.has(index) ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
                  } ${
                    // Dynamic styling based on animation phase
                    index === 0 && animationPhase >= 1
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg animate-pulse'
                      : index === 1 && animationPhase >= 2
                        ? 'bg-gradient-to-r from-purple-500 to-green-500 text-white shadow-lg animate-pulse'
                        : index === 2 && animationPhase >= 3
                          ? 'bg-gradient-to-r from-green-400 to-emerald-600 text-white shadow-lg animate-bounce'
                          : theme === 'dark'
                            ? 'bg-white text-gray-900 shadow-lg'
                            : 'bg-black text-white shadow-lg'
                  }`}
                  style={{
                    transitionDelay: `${index * 200 + 100}ms`,
                    boxShadow:
                      index === 0 && animationPhase >= 1
                        ? '0 0 25px rgba(139, 92, 246, 0.7)'
                        : index === 1 && animationPhase >= 2
                          ? '0 0 25px rgba(34, 197, 94, 0.7)'
                          : index === 2 && animationPhase >= 3
                            ? '0 0 30px rgba(16, 185, 129, 0.8)'
                            : undefined,
                  }}
                >
                  <span className="transform transition-transform duration-300">{step.number}</span>
                </div>

                {/* Success Notification - Small Card Under Circle 3 */}
                {index === 2 && showSuccess && (
                  <div className="absolute -left-20 top-14 animate-success-pop">
                    <div
                      className={`px-3 py-2 rounded-lg shadow-lg border ${
                        theme === 'dark'
                          ? 'bg-green-900/90 border-green-600 text-green-100'
                          : 'bg-green-50 border-green-200 text-green-800'
                      } backdrop-blur-sm`}
                    >
                      <div className="flex items-center space-x-2 text-sm">
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="font-medium">Success!</span>
                        <Star size={14} className="text-yellow-500 animate-spin" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="pl-4">
                  <h3
                    className={`text-xl font-bold mb-2 transition-all duration-300 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`transition-all duration-300 leading-relaxed ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>

                {/* Floating Particles */}
                {animationPhase > 0 && (
                  <>
                    <div
                      className={`absolute -right-4 top-2 w-2 h-2 rounded-full transition-all duration-500 ${
                        animationPhase === 1 && index <= 1
                          ? 'bg-purple-400 animate-ping'
                          : animationPhase === 2 && index >= 1
                            ? 'bg-green-400 animate-ping'
                            : 'bg-transparent'
                      }`}
                    />

                    <div
                      className={`absolute -right-8 top-8 w-1 h-1 rounded-full transition-all duration-500 ${
                        animationPhase === 1 && index <= 1
                          ? 'bg-blue-400 animate-pulse'
                          : animationPhase === 2 && index >= 1
                            ? 'bg-emerald-400 animate-pulse'
                            : 'bg-transparent'
                      }`}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced CSS Animations */}
        <style jsx>{`
          @keyframes flow-glow {
            0%,
            100% {
              box-shadow: 0 0 5px currentColor;
            }
            50% {
              box-shadow:
                0 0 25px currentColor,
                0 0 35px currentColor;
            }
          }

          @keyframes success-pop {
            0% {
              transform: scale(0) rotate(-180deg);
              opacity: 0;
            }
            50% {
              transform: scale(1.2) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
          }

          .animate-flow-glow {
            animation: flow-glow 1s ease-in-out infinite;
          }

          .animate-success-pop {
            animation: success-pop 0.6s ease-out;
          }

          .transition-all.duration-2000 {
            transition-duration: 2s;
          }

          /* Smooth gradient transitions */
          .timeline-item .absolute[class*='bg-gradient'] {
            background-size: 100% 200%;
            animation: gradientShift 2s ease-in-out infinite;
          }

          @keyframes gradientShift {
            0%,
            100% {
              background-position: 0% 0%;
            }
            50% {
              background-position: 0% 100%;
            }
          }
        `}</style>
      </section>
    </div>
  );
};

export default Homepage;
