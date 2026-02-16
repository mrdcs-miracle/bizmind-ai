from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import pandas as pd
import io
from pypdf import PdfReader
from docx import Document
import google.generativeai as genai # 1. Gemini Library එක ගෙන්වා ගැනීම

# --- SETUP ---
# NLTK දත්ත
nltk.download('vader_lexicon', quiet=True)
nltk.download('punkt', quiet=True)

# 2. Gemini API සැකසීම (මෙතන ඔයාගේ API Key එක දාන්න)
GEMINI_API_KEY = "AIzaSyAt5xuvhRX7vJnBF6CXwyzMyeuOYem8G5I"
genai.configure(api_key=GEMINI_API_KEY)

# Gemini මොඩල් එක තෝරාගැනීම
model = genai.GenerativeModel('gemini-pro')

app = FastAPI()

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sia = SentimentIntensityAnalyzer()

class Review(BaseModel):
    text: str

# --- FUNCTIONS ---

def analyze_text_sentiment(text):
    """NLTK මගින් Sentiment එක ගණනය කිරීම"""
    scores = sia.polarity_scores(str(text))
    sentiment = "Neutral"
    if scores['compound'] > 0.05:
        sentiment = "Positive"
    elif scores['compound'] < -0.05:
        sentiment = "Negative"
    return sentiment, scores['compound'], scores

def get_ai_solution(sentiment, text_summary):
    """3. Gemini AI වෙතින් විසඳුම් ඉල්ලීම"""
    try:
        # Gemini ට යවන ප්‍රශ්නය (Prompt) සකස් කිරීම
        prompt = f"""
        You are a smart business consultant. I have analyzed customer feedback and here is the result:
        
        Sentiment: {sentiment}
        Customer Feedback Summary/Text: "{text_summary[:1000]}"... (truncated)

        Based on this, provide:
        1. A brief explanation of WHY the customer feels this way.
        2. Three (3) actionable strategic steps/solutions the business should take immediately.
        
        Keep the answer professional, concise, and easy to read.
        """
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error connecting to AI: {str(e)}"

# --- ROUTES ---

@app.post("/analyze")
def analyze_sentiment(review: Review):
    # 1. Sentiment එක සොයනවා
    sentiment, score, detailed_scores = analyze_text_sentiment(review.text)
    
    # 2. Gemini ගෙන් විසඳුමක් ඉල්ලනවා
    ai_solution = get_ai_solution(sentiment, review.text)

    return {
        "sentiment": sentiment,
        "score": score,
        "detailed_scores": detailed_scores,
        "ai_solution": ai_solution # විසඳුම Frontend එකට යවනවා
    }

@app.post("/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    contents = await file.read()
    text_data_list = []

    try:
        if file.filename.endswith(('.xlsx', '.csv')):
            if file.filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(contents))
            else:
                df = pd.read_excel(io.BytesIO(contents))
            
            if "Review" in df.columns:
                text_data_list = df['Review'].dropna().astype(str).tolist()
            else:
                return {"error": "Excel/CSV file must contain a 'Review' column"}

        elif file.filename.endswith('.pdf'):
            reader = PdfReader(io.BytesIO(contents))
            full_text = ""
            for page in reader.pages:
                full_text += page.extract_text() + "\n"
            text_data_list = nltk.sent_tokenize(full_text)

        elif file.filename.endswith('.docx'):
            doc = Document(io.BytesIO(contents))
            full_text = ""
            for para in doc.paragraphs:
                full_text += para.text + "\n"
            text_data_list = nltk.sent_tokenize(full_text)
            
    except Exception as e:
        return {"error": f"Error reading file: {str(e)}"}

    # Bulk Analysis Logic
    stats = {"Positive": 0, "Negative": 0, "Neutral": 0}
    sample_texts = [] # AI එකට යවන්න සාම්පල ටිකක් ගන්නවා

    for i, text in enumerate(text_data_list):
        if len(text.strip()) < 3: continue
        sentiment, score, _ = analyze_text_sentiment(text)
        stats[sentiment] += 1
        if i < 5: sample_texts.append(text) # මුල් වාක්‍ය 5 ගන්නවා AI එකට පෙන්නන්න

    # සමස්ත ප්‍රතිඵලය
    total = sum(stats.values())
    overall_sentiment = max(stats, key=stats.get) if total > 0 else "Neutral"
    
    # 3. Gemini ගෙන් සමස්ත විසඳුමක් ඉල්ලනවා (File එකට අදාලව)
    summary_text = " ".join(sample_texts)
    ai_solution = get_ai_solution(overall_sentiment, summary_text)

    return {
        "filename": file.filename,
        "total_reviews": total,
        "detailed_scores": { 
            "pos": stats["Positive"] / total if total else 0, 
            "neg": stats["Negative"] / total if total else 0, 
            "neu": stats["Neutral"] / total if total else 0 
        },
        "sentiment": overall_sentiment,
        "ai_solution": ai_solution # විසඳුම යවනවා
    }