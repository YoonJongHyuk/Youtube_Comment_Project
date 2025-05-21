import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
import joblib

# 간단한 학습 데이터 (1: 스팸, 0: 정상)
data = [
    ("이 영상 클릭하면 돈 벌어요!", 1),
    ("지금 무료 이벤트 참여하세요!", 1),
    ("좋은 콘텐츠 감사합니다.", 0),
    ("정말 유익한 영상이에요", 0),
]

df = pd.DataFrame(data, columns=["text", "label"])

# 벡터화
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(df["text"])
y = df["label"]

# 모델 학습
model = LinearSVC()
model.fit(X, y)

# 모델 저장
joblib.dump(vectorizer, "vectorizer.joblib")
joblib.dump(model, "svc_model.joblib")
