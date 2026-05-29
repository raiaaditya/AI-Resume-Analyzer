import React, { useState, useEffect } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip as RechartsTooltip 
} from 'recharts';
import { 
  UploadCloud, CheckCircle, AlertTriangle, FileText, 
  BarChart2, Moon, Sun, Briefcase, Award, TrendingUp, ChevronRight,
  User, Lock, LogOut, LogIn, Mail, Loader2, RefreshCw
} from 'lucide-react';

function App() {
  const [theme, setTheme] = useState('dark');
  const [view, setView] = useState('landing'); // landing, dashboard, history
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [results, setResults] = useState(null);
  
  // Auth state
  const [token, setToken] = useState(window.localStorage.getItem('resumeAnalyzerToken') || null);
  const [username, setUsername] = useState(window.localStorage.getItem('resumeAnalyzerUser') || null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // login, register
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Load history when authenticated and viewing history tab
  useEffect(() => {
    if (token && view === 'history') {
      fetchHistory();
    }
  }, [token, view]);

  // Simulated progress steps for premium loader
  useEffect(() => {
    let interval;
    if (isAnalyzing) {
      setAnalysisStep(0);
      interval = setInterval(() => {
        setAnalysisStep(prev => (prev < 3 ? prev + 1 : prev));
      }, 1500);
    } else {
      setAnalysisStep(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const url = authTab === 'login' 
      ? 'http://localhost:8080/auth/login' 
      : 'http://localhost:8080/auth/register';

    const payload = authTab === 'login'
      ? { username: authUsername, password: authPassword }
      : { username: authUsername, email: authEmail, password: authPassword };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Success
      window.localStorage.setItem('resumeAnalyzerToken', data.token);
      window.localStorage.setItem('resumeAnalyzerUser', data.username);
      setToken(data.token);
      setUsername(data.username);
      setShowAuthModal(false);
      
      // Reset fields
      setAuthUsername('');
      setAuthEmail('');
      setAuthPassword('');
      
      // If user was trying to go to a tab, keep them there
      if (view === 'landing') {
        setView('dashboard');
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem('resumeAnalyzerToken');
    window.localStorage.removeItem('resumeAnalyzerUser');
    setToken(null);
    setUsername(null);
    setHistory([]);
    setResults(null);
    setView('landing');
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/resumes/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load history');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error(error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    if (!token) {
      setAuthTab('login');
      setShowAuthModal(true);
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (jobDescription) {
        formData.append('jobDescription', jobDescription);
      }

      const response = await fetch('http://localhost:8080/api/resumes/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setResults(data);
      setView('dashboard');
    } catch (error) {
      console.error("Error analyzing resume:", error);
      alert(`Analysis Failed: ${error.message}\n\nPlease check if backend services (API Gateway, Resume Service, AI Service) are running correctly.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getChartData = () => {
    if (!results) return [];
    
    // Heuristic calculations for rich dimensions
    const formatRisk = results.weaknesses.filter((weakness) => /format|layout|spacing|readability|font/i.test(weakness)).length;
    const skillScore = Math.min(100, 30 + (results.skills?.length || 0) * 8 + (results.matchPercentage || 0) * 0.2);
    const experienceScore = Math.min(100, 20 + (results.experienceYears || 0) * 12);
    const formattingScore = Math.max(40, 95 - formatRisk * 15);
    const impactScore = Math.max(30, 95 - (results.weaknesses?.length || 0) * 8 - (results.missingSkills?.length || 0) * 4);

    return [
      { subject: 'Skills Matrix', Score: Math.round(skillScore) },
      { subject: 'Experience Fit', Score: Math.round(experienceScore) },
      { subject: 'ATS Keywords', Score: Math.round(results.atsScore || 0) },
      { subject: 'Formatting Risk', Score: Math.round(formattingScore) },
      { subject: 'Impact Index', Score: Math.round(impactScore) },
    ];
  };

  const renderLanding = () => (
    <div className="landing-container animate-fade-in">
      <div className="hero-section">
        <div className="hero-badge">Next-Gen SaaS Resume Parser</div>
        <h1 className="hero-title">Optimize Your Resume with AI</h1>
        <p className="hero-subtitle">
          Supercharge your job application process. Our AI parses technical skills, compares against target job descriptions, calculates true ATS compatibility, and stores scans persistently.
        </p>
        <div className="cta-buttons">
          {token ? (
            <button className="btn-primary large" onClick={() => setView('dashboard')}>
              Go to Dashboard <ChevronRight size={20} />
            </button>
          ) : (
            <button className="btn-primary large" onClick={() => { setAuthTab('register'); setShowAuthModal(true); }}>
              Get Started Free <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
      
      <div className="features-grid">
        <div className="feature-card glass-panel">
          <BarChart2 className="feature-icon text-primary" size={32} />
          <h3>Dynamic ATS Scoring</h3>
          <p>Instantly calculates structural keyword density and evaluates matching ratios to ensure compliance.</p>
        </div>
        <div className="feature-card glass-panel">
          <FileText className="feature-icon text-secondary" size={32} />
          <h3>Persistent Database Storage</h3>
          <p>All scanned resumes are securely saved in PostgreSQL, allowing you to reload and inspect logs anytime.</p>
        </div>
        <div className="feature-card glass-panel">
          <TrendingUp className="feature-icon text-success" size={32} />
          <h3>Redis Caching Layer</h3>
          <p>Super-fast response speeds. Re-scans of identical resumes bypass NLP engines and resolve from cache instantly.</p>
        </div>
      </div>
    </div>
  );

  const renderLockScreen = (title, subtitle) => (
    <div className="lock-screen-container glass-panel animate-fade-in">
      <div className="lock-icon-wrapper">
        <Lock size={40} className="text-secondary" />
      </div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <button className="btn-primary" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
        <LogIn size={18} /> Sign In to Proceed
      </button>
    </div>
  );

  const renderDashboard = () => {
    if (!token) {
      return renderLockScreen(
        "Access Dashboard Features",
        "Sign in to analyze PDF resumes, match against job descriptions, and view detailed ATS matrix metrics."
      );
    }

    return (
      <div className="dashboard-container animate-fade-in">
        {!results && (
          <div className="upload-section glass-panel">
            <h2 className="section-heading">Resume Evaluation Hub</h2>
            <div className="form-group">
              <label>Target Job Description (Optional)</label>
              <textarea 
                placeholder="Paste the job description here for keyword mismatch analysis and compatibility percentages..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            <label htmlFor="file-upload" className="upload-zone">
              <UploadCloud className="upload-icon" />
              <h3>{file ? file.name : "Drag & drop PDF resume here"}</h3>
              <p className="text-muted">Supports .pdf files up to 10MB</p>
              <input 
                id="file-upload" 
                type="file" 
                accept=".pdf" 
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
            
            <div className="action-row">
              <button 
                className="btn-primary"
                onClick={handleAnalyze}
                disabled={!file || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="spinning" size={18} /> Analyzing...
                  </>
                ) : "Execute AI Audit"}
              </button>
            </div>
          </div>
        )}

        {results && (
          <div className="results-grid">
            <div className="overview-panel glass-panel">
              <div className="score-header">
                <div>
                  <h2>{results.filename}</h2>
                  <div className="tags">
                    <span className="tag primary">{results.industryCategory}</span>
                    <span className="tag secondary">{results.seniority}</span>
                    <span className="tag">{results.experienceYears} Years Exp.</span>
                  </div>
                </div>
                <button className="btn-outline" onClick={() => {setResults(null); setFile(null)}}>New Audit</button>
              </div>

              <div className="score-charts">
                <div className="score-circle-container">
                  <div 
                    className="score-circle" 
                    style={{ 
                      '--score': `${results.atsScore}%`, 
                      borderColor: results.atsScore > 80 ? 'var(--success)' : results.atsScore > 60 ? 'var(--warning)' : 'var(--danger)' 
                    }}
                  >
                    <span className="number">{results.atsScore}</span>
                    <span className="label">ATS Score</span>
                  </div>
                </div>
                {results.matchPercentage > 0 && (
                  <div className="score-circle-container">
                    <div className="score-circle secondary-circle" style={{ '--score': `${results.matchPercentage}%` }}>
                      <span className="number">{results.matchPercentage}%</span>
                      <span className="label">Job Match</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="chart-container">
                <h3 className="sub-heading">Dimension Metrics</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getChartData()}>
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="Score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.4} />
                    <RechartsTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="details-panel">
              <div className="glass-panel insight-card">
                <h3 className="sub-heading flex-center"><CheckCircle className="text-success icon-sm" /> Extracted Technical Skills</h3>
                <div className="skills-container">
                  {results.skills.length === 0 ? (
                    <span className="text-muted text-sm">No skills identified.</span>
                  ) : (
                    results.skills.map((skill, i) => <span key={i} className="skill-badge">{skill}</span>)
                  )}
                </div>
              </div>

              {results.missingSkills.length > 0 && (
                <div className="glass-panel insight-card">
                  <h3 className="sub-heading flex-center"><AlertTriangle className="text-warning icon-sm" /> Target Job Mismatch Keywords</h3>
                  <div className="skills-container">
                    {results.missingSkills.map((skill, i) => <span key={i} className="skill-badge missing">{skill}</span>)}
                  </div>
                </div>
              )}

              <div className="glass-panel insight-card">
                <h3 className="sub-heading flex-center"><TrendingUp className="text-primary icon-sm" /> AI-Identified Strengths</h3>
                <ul className="insight-list">
                  {results.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              <div className="glass-panel insight-card">
                <h3 className="sub-heading flex-center"><AlertTriangle className="text-danger icon-sm" /> Areas for Improvement</h3>
                <ul className="insight-list">
                  {results.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>

              <div className="glass-panel insight-card premium-border">
                <h3 className="sub-heading flex-center"><Award className="text-secondary icon-sm" /> Optimization Recommendations</h3>
                <ul className="insight-list">
                  {results.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>

              <div className="glass-panel insight-card premium-border">
                <h3 className="sub-heading flex-center"><Briefcase className="text-success icon-sm" /> Targeted Role Recommendations</h3>
                <ul className="insight-list">
                  {results.careerSuggestions?.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    if (!token) {
      return renderLockScreen(
        "View Audited Resume History",
        "Sign in to inspect past uploads, load structural ATS reports, and track your scoring evolution."
      );
    }

    return (
      <div className="history-container animate-fade-in glass-panel">
        <div className="history-header">
          <h2 className="section-heading">Scanned Logs</h2>
          <button className="btn-icon" onClick={fetchHistory} disabled={historyLoading}>
            <RefreshCw className={historyLoading ? "spinning" : ""} size={16} />
          </button>
        </div>
        
        {historyLoading ? (
          <div className="loader-wrapper py-4">
            <Loader2 className="spinning text-primary" size={32} />
          </div>
        ) : history.length === 0 ? (
          <p className="text-muted text-center py-4">No historical records saved in PostgreSQL.</p>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div 
                key={item.id} 
                className="history-item" 
                onClick={() => { setResults(item); setView('dashboard'); }}
              >
                <div className="history-info">
                  <FileText className="text-primary" />
                  <div>
                    <h4>{item.filename}</h4>
                    <span className="text-muted text-sm">{item.date} • {item.industryCategory}</span>
                  </div>
                </div>
                <div className="history-score">
                  <span className="score-badge" style={{ background: item.atsScore > 80 ? 'var(--success-alpha)' : 'var(--warning-alpha)' }}>
                    Score: {item.atsScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const analysisSteps = [
    "Reading binary PDF structural trees...",
    "Executing deterministic NLP skill entity matching...",
    "Computing cosine similarity vector arrays...",
    "Structuring optimization recommendations..."
  ];

  return (
    <div className="app-wrapper">
      <nav className="navbar glass-panel">
        <div className="nav-brand" onClick={() => setView('landing')}>
          <div className="logo-icon">AI</div>
          <span>Resume<span className="font-light">Auditor</span></span>
        </div>
        <div className="nav-links">
          <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>Auditor</button>
          <button className={`nav-btn ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>History</button>
          
          <div className="divider" />
          
          {token ? (
            <div className="auth-profile">
              <span className="profile-name"><User size={14} /> {username}</span>
              <button className="btn-logout" onClick={handleLogout} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="btn-login" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
              <LogIn size={16} /> Login
            </button>
          )}

          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      <main className="main-content">
        {view === 'landing' && renderLanding()}
        {view === 'dashboard' && renderDashboard()}
        {view === 'history' && renderHistory()}
      </main>

      {/* Full Screen Loader Overlay */}
      {isAnalyzing && (
        <div className="modal-overlay">
          <div className="loader-modal glass-panel">
            <Loader2 className="spinning text-primary loader-big" size={48} />
            <h3>Processing Document Analysis</h3>
            <p className="loading-step-text">{analysisSteps[analysisStep]}</p>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${(analysisStep + 1) * 25}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="auth-tabs">
              <button 
                className={`auth-tab-btn ${authTab === 'login' ? 'active' : ''}`} 
                onClick={() => { setAuthTab('login'); setAuthError(''); }}
              >
                Sign In
              </button>
              <button 
                className={`auth-tab-btn ${authTab === 'register' ? 'active' : ''}`} 
                onClick={() => { setAuthTab('register'); setAuthError(''); }}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="auth-form">
              {authError && (
                <div className="auth-error-banner">
                  <AlertTriangle size={16} />
                  <span>{authError}</span>
                </div>
              )}

              <div className="input-group">
                <label><User size={14} /> Username</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. johndoe" 
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                />
              </div>

              {authTab === 'register' && (
                <div className="input-group">
                  <label><Mail size={14} /> Email Address</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="e.g. john@example.com" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>
              )}

              <div className="input-group">
                <label><Lock size={14} /> Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>

              <button className="btn-primary auth-submit" type="submit" disabled={authLoading}>
                {authLoading ? (
                  <>
                    <Loader2 className="spinning" size={16} /> Authing...
                  </>
                ) : (
                  authTab === 'login' ? "Sign In" : "Register Account"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
