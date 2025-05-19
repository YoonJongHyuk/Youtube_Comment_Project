document.addEventListener('DOMContentLoaded', function() {
  const videoUrlInput = document.getElementById('videoUrl');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loadingDiv = document.getElementById('loading');
  const errorDiv = document.getElementById('error');
  const resultsDiv = document.getElementById('results');
  const commentList = document.getElementById('commentList');
  
  let comments = []; // 댓글 데이터 저장

  // 드래그 앤 드롭 기능 구현
  function setupDragAndDrop() {
    const items = commentList.getElementsByClassName('comment-item');
    let draggedItem = null;

    Array.from(items).forEach(item => {
      item.addEventListener('dragstart', function(e) {
        draggedItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        draggedItem = null;
      });

      item.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      item.addEventListener('dragenter', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
      });

      item.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
      });

      item.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        
        if (draggedItem !== this) {
          const allItems = [...commentList.getElementsByClassName('comment-item')];
          const draggedIndex = allItems.indexOf(draggedItem);
          const droppedIndex = allItems.indexOf(this);

          if (draggedIndex < droppedIndex) {
            this.parentNode.insertBefore(draggedItem, this.nextSibling);
          } else {
            this.parentNode.insertBefore(draggedItem, this);
          }
        }
      });
    });
  }

  // 댓글 목록 표시
  function displayComments(comments) {
    commentList.innerHTML = '';
    comments.forEach(comment => {
      const item = document.createElement('div');
      item.className = `comment-item ${comment.sentiment}`;
      item.draggable = true;
      
      item.innerHTML = `
        <div class="comment-text">${comment.text}</div>
        <div class="comment-sentiment">
          감정: ${getSentimentText(comment.sentiment)}
        </div>
      `;
      
      commentList.appendChild(item);
    });
    
    setupDragAndDrop();
  }

  // 감정 텍스트 변환
  function getSentimentText(sentiment) {
    switch(sentiment) {
      case 'normal': return '일반';
      case 'inappropriate': return '부적절';
      default: return '일반';
    }
  }

  // 분석 결과 표시
  function displayResults(analysis) {
    document.getElementById('totalComments').textContent = analysis.totalComments;
    document.getElementById('normalComments').textContent = analysis.normalComments;
    document.getElementById('inappropriateComments').textContent = analysis.inappropriateComments;
    
    resultsDiv.style.display = 'block';
  }

  // 에러 메시지 표시
  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    loadingDiv.style.display = 'none';
  }

  // 분석 버튼 클릭 이벤트
  analyzeBtn.addEventListener('click', async function() {
    const videoUrl = videoUrlInput.value.trim();
    
    if (!videoUrl) {
      showError('YouTube URL을 입력해주세요.');
      return;
    }

    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    resultsDiv.style.display = 'none';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      chrome.tabs.sendMessage(tab.id, { 
        action: 'analyzeComments',
        url: videoUrl
      }, response => {
        loadingDiv.style.display = 'none';
        
        if (chrome.runtime.lastError) {
          showError('메시지 전송 중 오류가 발생했습니다: ' + chrome.runtime.lastError.message);
          return;
        }

        if (!response) {
          showError('응답을 받지 못했습니다.');
          return;
        }

        if (response.error) {
          showError(response.error);
          return;
        }

        if (response.success) {
          displayResults(response);
          displayComments(response.comments);
        } else {
          showError('분석 중 오류가 발생했습니다.');
        }
      });
    } catch (error) {
      loadingDiv.style.display = 'none';
      showError('분석 중 오류가 발생했습니다: ' + error.message);
    }
  });
}); 