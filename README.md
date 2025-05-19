# YouTube 댓글 수집기

이 프로젝트는 YouTube API를 사용하여 특정 동영상의 댓글을 수집하는 파이썬 스크립트입니다.

## 설치 방법

1. 필요한 패키지 설치:
```bash
pip install -r requirements.txt
```

2. Google Cloud Console에서 프로젝트 설정:
   - [Google Cloud Console](https://console.cloud.google.com)에 접속
   - 새 프로젝트 생성
   - YouTube Data API v3 활성화
   - OAuth 2.0 클라이언트 ID 생성
   - 생성된 클라이언트 ID 정보를 `client_secrets.json` 파일로 다운로드하여 프로젝트 루트 디렉토리에 저장

## 사용 방법

1. 스크립트 실행:
```bash
python main.py
```

2. 프롬프트가 표시되면 분석하고자 하는 YouTube 동영상 ID를 입력합니다.
   - 동영상 ID는 YouTube URL의 `v=` 파라미터 값입니다.
   - 예: `https://www.youtube.com/watch?v=VIDEO_ID`

3. 처음 실행 시 Google 계정 인증이 필요합니다:
   - 브라우저 창이 열리면 Google 계정으로 로그인
   - 필요한 권한을 승인
   - 인증 정보는 `token.json` 파일에 저장되어 다음 실행 시 자동으로 사용됩니다.

## 주요 기능

- 동영상의 댓글 수집
- 댓글 작성자, 내용, 좋아요 수, 작성일 정보 제공
- 최대 100개의 댓글 수집 (설정에서 변경 가능)

## 참고사항

- API 할당량 제한이 있으므로 주의하여 사용해주세요.
- 프로젝트의 클라이언트 ID와 시크릿은 안전하게 보관해주세요. 