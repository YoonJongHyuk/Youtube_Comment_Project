const analyzeBtn = document.getElementById('analyzeBtn');
const showBlockedBtn = document.getElementById('showBlockedBtn');
const videoUrlInput = document.getElementById('videoUrl');
const resultContainer = document.getElementById('results');
const commentList = document.getElementById('commentList');
const blockedList = document.getElementById('blockedList');
const loadingDiv = document.getElementById('loading');
const commendDiv = document.getElementById('commend');

const API_BASE = "https://spam-ai-model-514551150962.asia-northeast3.run.app";

// ✅ 서버에서 차단된 작성자 목록 조회
async function getBlockedAuthorsFromServer() {
  try {
    const response = await fetch(`${API_BASE}/blocked_authors`);
    if (!response.ok) {
      console.warn("[🚫 API] blocked_authors 상태코드:", response.status);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error("[❌ API] blocked_authors 요청 실패:", error);
    return [];
  }
}

// ✅ 사용자 ID 가져오기 (최초 생성 시 랜덤)
function getUserId() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['user_id'], result => {
      let uid = result.user_id;
      if (!uid) {
        uid = 'user_' + Math.random().toString(36).substring(2, 10);
        chrome.storage.sync.set({ user_id: uid });
      }
      resolve(uid);
    });
  });
}

// ✅ 감정 텍스트 변환
function getSentimentText(sentiment) {
  return sentiment === 'inappropriate' ? '부적절' : '정상';
}

// ✅ 댓글 목록 렌더링
async function displayComments(comments) {
  commentList.innerHTML = '';

  // ✅ 차단된 작성자 목록 먼저 가져오기
  const blockedAuthors = await getBlockedAuthorsFromServer();

  comments.forEach(comment => {
    const item = document.createElement('div');
    item.className = `comment-item ${comment.sentiment}`;
    item.innerHTML = `
      <div class="comment-text">${comment.text}</div>
      <div class="comment-author">작성자: ${comment.author}</div>
      <div class="comment-sentiment">감정: ${getSentimentText(comment.sentiment)}</div>
    `;

    if (comment.sentiment === 'inappropriate') {
      const blockBtn = document.createElement('button');

      const isBlocked = blockedAuthors.includes(comment.author);

      if (isBlocked) {
        blockBtn.textContent = '차단됨';
        blockBtn.disabled = true;
      } else {
        blockBtn.textContent = '차단';
        blockBtn.addEventListener('click', async () => {
          const userId = await getUserId();
          await fetch(`${API_BASE}/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, author: comment.author })
          });
          blockBtn.disabled = true;
          blockBtn.textContent = '차단됨';
        });
      }

      item.appendChild(blockBtn);
    }

    commentList.appendChild(item);
  });
}


// ✅ 분석 결과 출력
function displayAnalysis(analysis) {
  resultContainer.style.display = 'block';
  document.getElementById('totalComments').textContent = analysis.totalComments;
  document.getElementById('normalComments').textContent = analysis.normalComments;
  document.getElementById('inappropriateComments').textContent = analysis.inappropriateComments;
  displayComments(analysis.comments);
}

// ✅ 차단된 닉네임 목록 표시
async function loadBlockedAuthorsUI() {
  blockedList.innerHTML = '🔃 불러오는 중...';

  try {
    const authors = await getBlockedAuthorsFromServer();

    if (!authors || authors.length === 0) {
      blockedList.innerHTML = '<p>차단된 작성자가 없습니다.</p>';
      return;
    }

    blockedList.innerHTML = '';
    authors.forEach(author => {
      const row = document.createElement('div');
      row.className = 'blocked-author-row';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = author;

      const unblockBtn = document.createElement('button');
      unblockBtn.textContent = '🔓 차단 해제';
      unblockBtn.addEventListener('click', async () => {
        const confirmed = confirm(`${author} 님의 차단을 해제할까요?`);
        if (!confirmed) return;

        await fetch(`${API_BASE}/unblock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'anonymous', author })
        });

        // 댓글 새로고침 트리거
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "refreshComments" });
        });

        loadBlockedAuthorsUI();
      });

      row.appendChild(nameSpan);
      row.appendChild(unblockBtn);
      blockedList.appendChild(row);
    });
  } catch (err) {
    console.error("차단된 작성자 목록 불러오기 실패:", err);
    blockedList.innerHTML = '<p>차단된 작성자 정보를 불러오지 못했습니다.</p>';
  }
}

// ✅ 팝업 열릴 때 현재 탭이 YouTube 동영상 페이지라면 자동 입력
document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    const url = tab.url;

    if (
      url.startsWith('https://www.youtube.com/watch') ||
      url.startsWith('https://www.youtube.com/shorts')
    ) {
      videoUrlInput.value = url;
    }
  });
});



// ✅ 분석 버튼 클릭 이벤트
analyzeBtn.addEventListener('click', () => {
  const url = videoUrlInput.value.trim();
  if (!url) {
    alert('YouTube 비디오 URL을 입력하세요.');
    return;
  }

  commentList.style.display = 'block';
  blockedList.style.display = 'none';

  loadingDiv.style.display = 'block';
  commendDiv.style.display = 'block';
  resultContainer.style.display = 'none';
  commentList.innerHTML = '';

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    chrome.tabs.sendMessage(tab.id, { action: "analyzeComments", url }, response => {
      loadingDiv.style.display = 'none';

      if (!response || !response.success) {
        resultContainer.innerHTML = `<p style="color:red;">분석 실패: ${response?.error || '알 수 없는 오류'}</p>`;
        return;
      }

      displayAnalysis(response);
    });
  });
});

// ✅ 차단된 닉네임 보기 버튼 클릭 이벤트
showBlockedBtn.addEventListener('click', () => {
  blockedList.style.display = 'block';
  resultContainer.style.display = 'block';
  commentList.style.display = 'none';
  commendDiv.style.display = 'none';
  loadBlockedAuthorsUI();
});

// ✅ content.js → blocked authors 요청 응답 (서버 사용)
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'getBlockedAuthors') {
    const authors = await getBlockedAuthorsFromServer();
    sendResponse(authors);
    return true;
  }
});
