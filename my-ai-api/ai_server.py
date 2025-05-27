from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import joblib

app = FastAPI()

# CORS 허용 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 배포 시 여기를 제한 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모델 로드
model = joblib.load("svc_model.joblib")
vectorizer = joblib.load("vectorizer.joblib")

# 메모리에 저장하는 차단 작성자 리스트 (간이 저장 방식)
blocked_authors = set() # 이 변수는 계속해서 FastAPI 백엔드 내부에서 사용됩니다.

# 입력 형식
class Comment(BaseModel):
    text: str
    author: str  # 작성자 닉네임 추가

class BlockRequest(BaseModel):
    user_id: str
    author: str  # 댓글 ID 대신 작성자 닉네임

# ✅ 감정 분석 API
@app.post("/analyze")
def analyze(comment: Comment):
    X = vectorizer.transform([comment.text])
    pred = model.predict(X)[0]
    sentiment = "inappropriate" if pred == 1 else "normal"

    # 부적절한 경우 해당 작성자 저장
    if sentiment == "inappropriate":
        blocked_authors.add(comment.author) # 백엔드 자체 관리를 위한 저장

    return {"sentiment": sentiment}

# ✅ 차단 요청 API
@app.post("/block")
def block_comment(data: BlockRequest):
    print(f"[차단 요청] 사용자: {data.user_id}, 작성자: {data.author}")
    blocked_authors.add(data.author) # 백엔드 자체 관리를 위한 저장
    return {"status": "success"}

# ✅ 차단 댓글 ID 목록 API
# 이 엔드포인트는 이제 프런트엔드에서 직접 호출될 필요가 없습니다.
# 하지만 백엔드에서 이 목록이 필요할 경우 유지할 수 있습니다.
@app.get("/blocked_authors")
def get_blocked_authors():
    try:
        # 백엔드에 저장된 차단 작성자 목록을 반환 (프런트엔드는 이제 이걸 안 씀)
        return JSONResponse(content=list(blocked_authors))
    except Exception as e:
        print(f"[❌ blocked_authors] 오류 발생: {str(e)}")
        return JSONResponse(content=[])