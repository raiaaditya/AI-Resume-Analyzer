import os
import re
import json
import spacy
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv
from prometheus_client import Counter, Histogram, Gauge, generate_latest

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Prometheus Metrics
REQUEST_COUNT = Counter(
    'ai_service_requests_total',
    'Total number of requests to AI Service',
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'ai_service_request_duration_seconds',
    'Duration of requests to AI Service',
    ['method', 'endpoint']
)

ANALYZE_ERRORS = Counter(
    'ai_service_analysis_errors_total',
    'Total number of analysis errors',
    ['error_type']
)

HEALTH_STATUS = Gauge(
    'ai_service_health_status',
    'Health status of AI Service (1=healthy, 0=unhealthy)'
)

try:
    nlp = spacy.load("en_core_web_sm")
    HEALTH_STATUS.set(1)
except OSError:
    print("Downloading spacy model en_core_web_sm...")
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")
    HEALTH_STATUS.set(1)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Comprehensive dictionary of technical skills and their categories for deterministic matching
TECH_DICT = {
    "Data Science": ["pandas", "numpy", "scikit-learn", "tensorflow", "keras", "pytorch", "matplotlib", "seaborn", "tableau", "power bi", "data analysis", "machine learning", "ml", "deep learning"],
    "Web Development": ["react", "angular", "vue", "node.js", "express", "django", "flask", "spring boot", "html", "css", "javascript", "typescript", "graphql", "rest api"],
    "DevOps": ["docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ansible", "jenkins", "ci/cd", "linux", "bash", "prometheus", "grafana"],
    "Cybersecurity": ["penetration testing", "wireshark", "nmap", "metasploit", "cryptography", "firewalls", "owasp", "security", "vulnerability"],
    "Databases": ["sql", "mysql", "postgresql", "mongodb", "redis", "cassandra", "elasticsearch", "nosql", "oracle"]
}

ALL_SKILLS = set([skill for category in TECH_DICT.values() for skill in category])
ALL_SKILLS.update(["python", "java", "c++", "c#", "ruby", "go", "rust", "php", "swift", "kotlin", "git", "github", "agile", "scrum"])

def extract_text_from_pdf(file_stream):
    text = ""
    try:
        reader = PyPDF2.PdfReader(file_stream)
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text

def extract_skills_deterministic(text):
    text_lower = text.lower()
    # Normalize punctuation for better matching
    text_lower = re.sub(r'[,;/|()-]', ' ', text_lower)
    words = set(text_lower.split())
    
    found_skills = set()
    for skill in ALL_SKILLS:
        # Exact word match for short skills to avoid substring issues (e.g. "go" inside "good")
        if len(skill) <= 3 and re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
            found_skills.add(skill.title() if skill != 'ml' else 'ML')
        elif len(skill) > 3 and skill in text_lower:
            # Special capitalization
            cap_skill = skill.title()
            if skill == "scikit-learn": cap_skill = "Scikit-Learn"
            if skill == "node.js": cap_skill = "Node.js"
            if skill == "ci/cd": cap_skill = "CI/CD"
            if skill == "aws": cap_skill = "AWS"
            if skill == "gcp": cap_skill = "GCP"
            if skill == "sql": cap_skill = "SQL"
            found_skills.add(cap_skill)
    return list(found_skills)

def extract_experience_years(text):
    text_lower = text.lower()
    
    # Simple heuristic 1: Look for "X years of experience"
    pattern1 = r'(\d+)\+?\s*(?:years|yrs?)(?:\s*of)?\s*experience'
    matches1 = re.findall(pattern1, text_lower)
    if matches1:
        return max([int(m) for m in matches1])
        
    # Simple heuristic 2: Count date ranges (e.g., 2018 - 2022) to estimate years
    pattern2 = r'(20\d{2}|19\d{2})\s*(?:-|to)\s*(20\d{2}|present|current|now)'
    matches2 = re.findall(pattern2, text_lower)
    
    total_years = 0
    if matches2:
        for start, end in matches2:
            try:
                start_yr = int(start)
                end_yr = 2024 if end in ['present', 'current', 'now'] else int(end)
                if end_yr >= start_yr:
                    total_years += (end_yr - start_yr)
            except ValueError:
                pass
        
        # Deduplicate overlapping years roughly
        if total_years > 0:
            return min(total_years, 25) # Cap at realistic max
            
    # If student, intern keywords present but no years
    if "intern" in text_lower or "student" in text_lower or "bachelor" in text_lower:
        return 0
        
    return 0

def classify_industry(skills):
    scores = {category: 0 for category in TECH_DICT.keys()}
    skills_lower = [s.lower() for s in skills]
    
    for category, category_skills in TECH_DICT.items():
        for skill in skills_lower:
            if skill in category_skills:
                scores[category] += 1
                
    best_category = max(scores, key=scores.get)
    if scores[best_category] == 0:
        return "Software Engineering" # Default fallback
    return best_category

def get_groq_insights(exp_years, industry, seniority, skills, missing_skills, ats_score, match_percentage):
    from openai import OpenAI
    client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=GROQ_API_KEY)
    
    prompt = f"""
    You are an expert technical recruiter and ATS system.
    I have already extracted the factual data from a resume. DO NOT invent or hallucinate any skills, tools, or experience.
    Base your insights STRICTLY on these extracted facts:
    
    - Experience: {exp_years} years
    - Industry: {industry}
    - Seniority Level: {seniority}
    - Detected Skills: {', '.join(skills) if skills else 'None'}
    - Missing Skills (based on Job Description): {', '.join(missing_skills) if missing_skills else 'None'}
    - ATS Score: {ats_score}/100
    - Job Match Percentage: {match_percentage}%
    
    Analyze these facts and provide a JSON response with the following exact keys and string lists:
    {{
      "strengths": [ 3-4 bullet points highlighting their strong areas based ONLY on the detected skills and experience ],
      "weaknesses": [ 2-3 bullet points highlighting gaps, such as the specific missing skills or low experience ],
      "recommendations": [ 3 actionable resume improvement tips based on the data ],
      "careerSuggestions": [ 2-3 career paths or roles they are well-suited for based strictly on their detected industry and skills ]
    }}
    
    Return strictly valid JSON, with no markdown formatting or extra text.
    """
    
    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )
        content = response.choices[0].message.content.strip()
        content = content.removeprefix('```json').removesuffix('```').strip()
        return json.loads(content)
    except Exception as e:
        print(f"Groq API Error: {e}")
        return None

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    duration = time.time() - request.start_time
    endpoint = request.endpoint or 'unknown'
    REQUEST_DURATION.labels(method=request.method, endpoint=endpoint).observe(duration)
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=endpoint,
        status=response.status_code
    ).inc()
    return response

@app.route('/health', methods=['GET'])
def health_check():
    HEALTH_STATUS.set(1)
    return jsonify({"status": "healthy"}), 200

@app.route('/metrics', methods=['GET'])
def metrics():
    return generate_latest(), 200, {'Content-Type': 'text/plain; charset=utf-8'}

@app.route('/api/analyze', methods=['POST'])
def analyze_resume():
    try:
        if 'file' not in request.files:
            ANALYZE_ERRORS.labels(error_type='no_file').inc()
            return jsonify({"error": "No file part in the request"}), 400
            
        file = request.files['file']
        if file.filename == '':
            ANALYZE_ERRORS.labels(error_type='empty_filename').inc()
            return jsonify({"error": "No selected file"}), 400
            
        job_description = request.form.get('jobDescription', '').strip()
        resume_text = extract_text_from_pdf(file)
        
        if not resume_text:
            ANALYZE_ERRORS.labels(error_type='pdf_extraction_failed').inc()
            return jsonify({"error": "Could not extract text from PDF"}), 400
            
        # 1. Deterministic Extraction
        skills = extract_skills_deterministic(resume_text)
        jd_skills = extract_skills_deterministic(job_description) if job_description else []
        
        missing_skills = list(set(jd_skills) - set(skills)) if jd_skills else []
        exp_years = extract_experience_years(resume_text)
        industry = classify_industry(skills)
        
        # Seniority classification
        if exp_years == 0:
            seniority = "Fresher"
        elif exp_years <= 2:
            seniority = "Junior"
        elif exp_years <= 5:
            seniority = "Mid-level"
        else:
            seniority = "Senior"
            
        # 2. Similarity and Scoring
        match_percentage = 0
        if job_description:
            vectorizer = TfidfVectorizer(stop_words='english')
            try:
                tfidf_matrix = vectorizer.fit_transform([resume_text, job_description])
                match_percentage = int(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0] * 100)
            except ValueError:
                pass
                
        # Deterministic ATS Score
        # Base format score (assume 40 for parsing successfully)
        ats_score = 40 
        
        # Add points for skills density (max 30)
        ats_score += min(len(skills) * 2, 30)
        
        # Add points for experience explicitly stated (max 10)
        if exp_years > 0: ats_score += 10
        
        # If JD is provided, factor in the missing skills penalty and match percentage
        if job_description:
            if len(jd_skills) > 0:
                match_ratio = len(set(skills).intersection(set(jd_skills))) / len(jd_skills)
                ats_score += int(match_ratio * 20) # Max 20 for skill overlap
            ats_score = int((ats_score + match_percentage) / 2)
        else:
            ats_score += 20 # Bonus for generic resumes without JD

        ats_score = min(max(ats_score, 0), 100)
        
        # 3. Hybrid AI Reasoning via Groq
        groq_data = None
        if GROQ_API_KEY:
            groq_data = get_groq_insights(exp_years, industry, seniority, skills, missing_skills, ats_score, match_percentage)
            
        # Fallback if Groq fails or no key
        if not groq_data:
            # 1. Strengths
            strengths_list = []
            if skills:
                top_skills = ", ".join(skills[:3])
                strengths_list.append(f"Demonstrates strong knowledge and practical application of {top_skills}.")
            strengths_list.append(f"Classified at a {seniority} level with {exp_years} years of experience in {industry}.")
            if len(skills) > 5:
                strengths_list.append(f"Broad technical versatility with {len(skills)} key skills identified across the resume.")
            else:
                strengths_list.append(f"Solid foundational focus on {industry} methodologies.")

            # 2. Weaknesses
            weaknesses_list = []
            if missing_skills:
                top_missing = ", ".join(missing_skills[:3])
                weaknesses_list.append(f"Resume is missing critical alignment keywords from the JD: {top_missing}.")
            if exp_years < 3:
                weaknesses_list.append(f"Relatively short duration of professional experience ({exp_years} years) for highly competitive roles.")
            weaknesses_list.append("Lacks prominent display of quantifiable metrics or numerical success indicators in project descriptions.")

            # 3. Recommendations
            recommendations_list = []
            if missing_skills:
                recommendations_list.append(f"Integrate missing core skills such as {', '.join(missing_skills[:2])} into your projects section.")
            recommendations_list.append("Rephrase project achievements using the STAR methodology (Situation, Task, Action, Result) focusing on outcomes.")
            recommendations_list.append("Optimize the resume header and layout spacing to pass through automated parser configurations cleanly.")

            # 4. Career Suggestions
            career_map = {
                "Web Development": ["Full Stack Developer", "Frontend Engineer", "Backend Developer"],
                "DevOps": ["DevOps Engineer", "Cloud Engineer", "Site Reliability Engineer (SRE)"],
                "Data Science": ["Data Scientist", "Machine Learning Engineer", "Data Analyst"],
                "Cybersecurity": ["Security Analyst", "Penetration Tester", "Information Security Engineer"],
                "Databases": ["Database Administrator", "Data Engineer", "Database Developer"]
            }
            career_suggestions_list = career_map.get(industry, ["Software Engineer", "Systems Analyst", "Technical Consultant"])

            groq_data = {
                "strengths": strengths_list,
                "weaknesses": weaknesses_list,
                "recommendations": recommendations_list,
                "careerSuggestions": career_suggestions_list
            }
            
        final_response = {
            "atsScore": ats_score,
            "matchPercentage": match_percentage,
            "skills": skills[:20],
            "missingSkills": missing_skills[:15],
            "experienceYears": exp_years,
            "industryCategory": industry,
            "seniority": seniority,
            "strengths": groq_data.get("strengths", []),
            "weaknesses": groq_data.get("weaknesses", []),
            "recommendations": groq_data.get("recommendations", []),
            "careerSuggestions": groq_data.get("careerSuggestions", [])
        }
        
        return jsonify(final_response), 200
    except Exception as e:
        ANALYZE_ERRORS.labels(error_type='unexpected_error').inc()
        print(f"Analysis error: {e}")
        return jsonify({"error": "Internal server error during analysis"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
