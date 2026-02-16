"use client";

import { useState, useRef } from "react";
import axios from "axios";
import {
  Send, Paperclip, Bot, Sparkles, StopCircle,
  CheckCircle2, AlertCircle, HelpCircle, Lightbulb
} from "lucide-react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
import ReactMarkdown from "react-markdown"; // AI උත්තර ලස්සනට පෙන්වන්න (Optional, but good)

ChartJS.register(ArcElement, Tooltip, Legend);

// 1. Data Type එකට 'ai_solution' එකතු කළා
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
  ai_solution?: string; // අලුත් කොටස
}

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      const response = await axios.post("http://127.0.0.1:8000/analyze", { text: inputText });
      setResult(response.data);
    } catch (error) {
      console.error("Error:", error);
      alert("Server error!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setResult(null);
    setInputText(`Analyzing file: ${file.name}...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:8000/analyze-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.error) {
        alert(response.data.error);
      } else {
        setResult(response.data);
      }
      setInputText("");
    } catch {
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
      <header className="p-5 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">BizMind AI</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Beta</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 pb-32 overflow-y-auto">
        {!result && !isLoading ? (
          <div className="text-center space-y-6 max-w-2xl animate-in fade-in duration-700">
            <div className="mb-4 inline-block p-4 rounded-full bg-white shadow-sm">
              <Sparkles className="w-10 h-10 text-purple-500" />
            </div>
            <h1 className="text-5xl font-medium text-slate-300">
              <span className="bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Hello, Human.</span>
            </h1>
            <p className="text-2xl text-slate-400 font-light">How can I help analyze your business today?</p>
          </div>
        ) : (
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">

            {isLoading && (
              <div className="p-12 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <Bot className="w-6 h-6 text-blue-600 absolute top-3 left-3" />
                </div>
                <p className="text-slate-500 animate-pulse">Generating AI insights...</p>
              </div>
            )}

            {!isLoading && result && (
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* වම් පැත්ත: Charts & Scores */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 rounded-full ${result.sentiment === 'Positive' ? 'bg-green-100 text-green-600' :
                        result.sentiment === 'Negative' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'
                      }`}>
                      {result.sentiment === 'Positive' ? <CheckCircle2 className="w-8 h-8" /> :
                        result.sentiment === 'Negative' ? <AlertCircle className="w-8 h-8" /> :
                          <HelpCircle className="w-8 h-8" />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">{result.sentiment} Sentiment</h2>
                      <p className="text-slate-500 text-sm">
                        {result.filename ? `File: ${result.filename} (${result.total_reviews} reviews)` : 'Based on input text'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl mb-6">
                    <div className="w-40 h-40">
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
                </div>

                {/* දකුණු පැත්ත: AI විසඳුම් (Gemini Response) */}
                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-6 h-6 text-yellow-500" />
                    <h3 className="text-lg font-bold text-slate-800">AI Strategic Insights</h3>
                  </div>

                  <div className="prose prose-sm text-slate-600 max-h-100 overflow-y-auto pr-2">
                    {/* AI Text එක පේළි කඩල පෙන්වන්න */}
                    {result.ai_solution ? (
                      <ReactMarkdown>{result.ai_solution}</ReactMarkdown>
                    ) : (
                      <p>No AI suggestions available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 w-full bg-[#f0f4f9] p-4 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-4xl shadow-lg border border-slate-200 p-2 pl-6 flex items-end gap-2 transition-shadow focus-within:shadow-xl focus-within:border-blue-300">
            <div className="pb-3">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.xlsx,.pdf,.docx" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
            </div>
            <textarea
              className="w-full max-h-32 bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 resize-none py-4"
              placeholder="Enter customer review or upload a file..."
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <div className="pb-2 pr-2">
              <button onClick={handleAnalyze} disabled={!inputText.trim() || isLoading} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md">
                {isLoading ? <StopCircle className="w-5 h-5 animate-pulse" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}