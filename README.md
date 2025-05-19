# YouTube 댓글 분석기

YouTube 영상의 댓글을 자동으로 수집하고 감정 분석을 수행하는 크롬 확장 프로그램입니다.

## 주요 기능

- YouTube 영상 URL 입력을 통한 댓글 수집
- 댓글 감정 분석 (긍정/부정/중립)
- 댓글 통계 제공
- 간편한 사용자 인터페이스

## 설치 방법

1. 이 저장소를 클론하거나 다운로드합니다:
   ```bash
   git clone [repository-url]
   ```

2. 크롬 브라우저에서 확장 프로그램 페이지로 이동합니다:
   - 주소창에 `chrome://extensions` 입력
   - 또는 크롬 메뉴 → 도구 더보기 → 확장 프로그램

3. 개발자 모드를 활성화합니다:
   - 우측 상단의 "개발자 모드" 토글을 켜기로 변경

4. 확장 프로그램을 로드합니다:
   - "압축해제된 확장 프로그램을 로드합니다" 버튼 클릭
   - 다운로드한 프로젝트 폴더 선택

## YouTube Data API 키 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속합니다.

2. 새 프로젝트를 생성하거나 기존 프로젝트를 선택합니다.

3. YouTube Data API v3를 활성화합니다:
   - API 및 서비스 → 라이브러리로 이동
   - "YouTube Data API v3" 검색
   - API 선택 후 "사용" 버튼 클릭

4. API 키를 생성합니다:
   - API 및 서비스 → 사용자 인증 정보로 이동
   - "사용자 인증 정보 만들기" → "API 키" 선택
   - 생성된 API 키를 복사

5. 확장 프로그램 설정에서 API 키 입력:
   - 확장 프로그램 아이콘 우클릭 → "옵션" 선택
   - API 키 입력 필드에 복사한 키 붙여넣기
   - "설정 저장" 버튼 클릭

## 사용 방법

1. 크롬 브라우저의 도구 모음에서 확장 프로그램 아이콘을 클릭합니다.

2. YouTube 영상 URL을 입력 필드에 붙여넣습니다:
   - 예: `https://www.youtube.com/watch?v=VIDEO_ID`
   - 또는 `youtu.be/VIDEO_ID` 형식도 가능

3. "댓글 분석 시작" 버튼을 클릭하거나 Enter 키를 누릅니다.

4. 잠시 후 분석 결과가 표시됩니다:
   - 총 댓글 수
   - 긍정적 댓글 수
   - 부정적 댓글 수
   - 중립적 댓글 수

## 주의사항

- YouTube Data API 키가 필요합니다.
- API 할당량 제한이 있을 수 있습니다 (일일 10,000 유닛).
- 댓글이 비활성화된 영상은 분석할 수 없습니다.
- 인터넷 연결이 필요합니다.

## 기술 스택

- HTML/CSS/JavaScript
- Chrome Extension API
- YouTube Data API v3

## 라이선스

MIT License

## 기여하기

1. 이 저장소를 포크합니다.
2. 새로운 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`).
3. 변경사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`).
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`).
5. Pull Request를 생성합니다.