"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { 
  Send, 
  Paperclip, 
  Bot, 
  Sparkles, 
  StopCircle, 
  //FileText, 
 // BarChart3,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

// Chart.js Register 
ChartJS.register(ArcElement, Tooltip, Legend);

// --- Types ---
interface AnalysisResult {
  sentiment: string;
  score: number;
  detailed_scores: {
    pos: number;
    neg: number;
    neu: number;
  };
  filename?: string;
  total_reviews?: number;
}

export default function Home() {
  // --- States ---
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Functions ---

  // 1. Text analyze
  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    setResult(null); // Old  result clear 

    try {
      const response = await axios.post("http://127.0.0.1:8000/analyze", {
        text: inputText,
      });
      setResult(response.data);
    } catch (error) {
      console.error("Error analyzing:", error);
      alert("Server error! Make sure backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  //File Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setResult(null);
    setInputText(`Analyzing file: ${file.name}...`); // 

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:8000/analyze-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.error) {
        alert(response.data.error);
        setInputText("");
      } else {
        setResult({
          sentiment: "Bulk Analysis",
          score: 0,
          detailed_scores: response.data.detailed_scores,
          filename: response.data.filename,
          total_reviews: response.data.total_reviews
        });
        setInputText(""); //
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading file.");
      setInputText("");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] text-slate-900 font-sans flex flex-col">
      
      {/* --- 1. Top Navigation (සරල Logo එක) --- */}
      <header className="p-5 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            BizMind AI
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Beta</span>
        </div>
      </header>

      {/* --- 2. Main Content Area  */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 pb-32 overflow-y-auto">
        
        {!result && !isLoading ? (
          
          <div className="text-center space-y-6 max-w-2xl animate-in fade-in duration-700">
            <div className="mb-4 inline-block p-4 rounded-full bg-white shadow-sm">
                <Sparkles className="w-10 h-10 text-purple-500" />
            </div>
            <h1 className="text-5xl font-medium text-slate-300">
              <span className="bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Hello, Chamika.
              </span>
            </h1>
            <p className="text-2xl text-slate-400 font-light">
              How can I help analyze your business today?
            </p>
            
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-left">
                <div className="p-4 bg-white rounded-4xl border border-slate-100 shadow-sm hover:bg-slate-50 cursor-pointer transition">
                    <p className="text-sm font-medium text-slate-700">Analyze Feedback</p>
                    <p className="text-xs text-slate-400 mt-1">Paste a customer review to see sentiment.</p>
                </div>
                <div className="p-4 bg-white rounded-4xl border border-slate-100 shadow-sm hover:bg-slate-50 cursor-pointer transition">
                    <p className="text-sm font-medium text-slate-700">Bulk Upload</p>
                    <p className="text-xs text-slate-400 mt-1">Upload PDF or Excel files for analysis.</p>
                </div>
                <div className="p-4 bg-white rounded-4xl border border-slate-100 shadow-sm hover:bg-slate-50 cursor-pointer transition">
                    <p className="text-sm font-medium text-slate-700">Get Insights</p>
                    <p className="text-xs text-slate-400 mt-1">Identify key trends in your data.</p>
                </div>
            </div>
          </div>
        ) : (
          // ප්‍රතිඵල තිරය (Result Screen)
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            
            {/* Loading State */}
            {isLoading && (
               <div className="p-12 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                     <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                     <Bot className="w-6 h-6 text-blue-600 absolute top-3 left-3" />
                  </div>
                  <p className="text-slate-500 animate-pulse">Analyzing logic patterns...</p>
               </div>
            )}

            {/* Results Display */}
            {!isLoading && result && (
               <div className="p-8">
                  {/* Header Result */}
                  <div className="flex items-center gap-4 mb-8">
                      <div className={`p-3 rounded-full ${
                          result.sentiment === 'Positive' ? 'bg-green-100 text-green-600' :
                          result.sentiment === 'Negative' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'
                      }`}>
                          {result.sentiment === 'Positive' ? <CheckCircle2 className="w-8 h-8"/> : 
                           result.sentiment === 'Negative' ? <AlertCircle className="w-8 h-8"/> : 
                           <HelpCircle className="w-8 h-8"/>}
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold text-slate-800">{result.sentiment} Sentiment</h2>
                          <p className="text-slate-500 text-sm">
                            {result.filename ? `Analyzed file: ${result.filename} (${result.total_reviews} reviews)` : 'Based on the text provided'}
                          </p>
                      </div>
                  </div>

                  {/* Chart & Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Pie Chart */}
                      <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl">
                          <div className="w-48 h-48">
                              <Pie data={{
                                  labels: ['Positive', 'Negative', 'Neutral'],
                                  datasets: [{
                                      data: [result.detailed_scores.pos, result.detailed_scores.neg, result.detailed_scores.neu],
                                      backgroundColor: ['#22c55e', '#ef4444', '#eab308'],
                                      borderWidth: 0
                                  }]
                              }} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                          </div>
                      </div>

                      {/* Detailed Progress Bars */}
                      <div className="space-y-6 justify-center flex flex-col">
                          <div>
                              <div className="flex justify-between text-sm mb-2 font-medium"><span>Positivity</span><span>{(result.detailed_scores.pos * 100).toFixed(1)}%</span></div>
                              <div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div style={{ width: `${result.detailed_scores.pos * 100}%` }} className="h-full bg-green-500 rounded-full"></div></div>
                          </div>
                          <div>
                              <div className="flex justify-between text-sm mb-2 font-medium"><span>Negativity</span><span>{(result.detailed_scores.neg * 100).toFixed(1)}%</span></div>
                              <div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div style={{ width: `${result.detailed_scores.neg * 100}%` }} className="h-full bg-red-500 rounded-full"></div></div>
                          </div>
                          <div>
                              <div className="flex justify-between text-sm mb-2 font-medium"><span>Neutrality</span><span>{(result.detailed_scores.neu * 100).toFixed(1)}%</span></div>
                              <div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div style={{ width: `${result.detailed_scores.neu * 100}%` }} className="h-full bg-yellow-500 rounded-full"></div></div>
                          </div>
                      </div>
                  </div>
               </div>
            )}
          </div>
        )}
      </main>

      {/* --- 3. Bottom Input Area (Gemini Style) --- */}
      <footer className="fixed bottom-0 w-full bg-[#f0f4f9] p-4 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-4xl shadow-lg border border-slate-200 p-2 pl-6 flex items-end gap-2 transition-shadow focus-within:shadow-xl focus-within:border-blue-300">
            
            {/* File Upload Button (Icon) */}
            <div className="pb-3">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept=".csv,.xlsx,.pdf,.docx" 
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Upload File"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
            </div>

            {/* Text Input Area */}
            <textarea
              className="w-full max-h-32 bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 resize-none py-4"
              placeholder="Enter customer review or upload a file..."
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />

            {/* Send Button */}
            <div className="pb-2 pr-2">
                <button
                  onClick={handleAnalyze}
                  disabled={!inputText.trim() || isLoading}
                  className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md"
                >
                  {isLoading ? <StopCircle className="w-5 h-5 animate-pulse" /> : <Send className="w-5 h-5" />}
                </button>
            </div>
          </div>
          
          <p className="text-center text-xs text-slate-400 mt-3">
            BizMind AI can make mistakes. Consider checking important information.
          </p>
        </div>
      </footer>

    </div>
  );
}