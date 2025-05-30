FROM python:3.9-slim

# 작업 디렉토리 설정
WORKDIR /app

# 필요 파일 복사
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ai_server.py .
# COPY svc_model.joblib .
# COPY vectorizer.joblib .

# 서버 실행 명령
CMD ["uvicorn", "ai_server:app", "--host", "0.0.0.0", "--port", "8080"]
