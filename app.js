let currentPaugeran = 'kbj';
let kasusData = [];
let currentKasusIndex = 0;
let userAnswers = {};

let latinTimer = null;
let latinCountdownVal = 30;

function stopLatinTimer() {
  if (latinTimer) {
    clearInterval(latinTimer);
    latinTimer = null;
  }
  const latinContent = document.getElementById('story-latin-content');
  const latinBtn = document.getElementById('btn-toggle-latin');
  const timerInfo = document.getElementById('latin-timer-info');

  if (latinContent) latinContent.style.display = 'none';
  if (latinBtn) latinBtn.classList.remove('active');
  if (timerInfo) timerInfo.style.display = 'none';
}

function startLatinTimer() {
  if (latinTimer) clearInterval(latinTimer);
  latinCountdownVal = 30;

  const latinContent = document.getElementById('story-latin-content');
  const latinBtn = document.getElementById('btn-toggle-latin');
  const timerInfo = document.getElementById('latin-timer-info');
  const countdownEl = document.getElementById('latin-countdown');

  if (latinContent) latinContent.style.display = 'block';
  if (latinBtn) latinBtn.classList.add('active');
  if (timerInfo) timerInfo.style.display = 'inline-block';
  if (countdownEl) countdownEl.textContent = latinCountdownVal;

  latinTimer = setInterval(() => {
    latinCountdownVal--;
    if (countdownEl) countdownEl.textContent = latinCountdownVal;

    if (latinCountdownVal <= 0) {
      stopLatinTimer();
    }
  }, 1000);
}

function formatLatinText(text) {
  if (!text) return '';
  // 1. Hilangkan tanda hubung (-) yang ada di tengah kata
  const cleanText = text.replace(/-/g, '');
  // 2. Kapitalkan awal kalimat (awal teks, setelah titik/tanda tanya/seru, atau setelah baris baru)
  return cleanText.replace(/(^\s*|[.!?]\s+|\n+\s*)([a-zà-ÿ])/g, (match, prefix, char) => {
    return prefix + char.toUpperCase();
  });
}

function convertToAksara(text) {
  if (!text) return '';
  const lowerText = text.toLowerCase();
  let result = '';

  if (currentPaugeran === 'kbj' && typeof window.transliterasiKBJ === 'function') {
    result = window.transliterasiKBJ(lowerText);
  } else if (currentPaugeran === 'kawi' && typeof window.transliterasiKawi === 'function') {
    result = window.transliterasiKawi(lowerText);
  } else if (currentPaugeran === 'sriwedari' && typeof window.transliterasiSriwedari === 'function') {
    result = window.transliterasiSriwedari(lowerText);
  } else if (currentPaugeran === 'kaj_simplified' && typeof window.transliterasiSimplified === 'function') {
    result = window.transliterasiSimplified(lowerText);
  } else if (currentPaugeran === 'kaj_tradisional' && typeof window.transliterasiTradisional === 'function') {
    result = window.transliterasiTradisional(lowerText);
  } else {
    result = lowerText;
  }

  // Menghapus alternatif penulisan di dalam kurung beserta spasi di depannya
  return result.replace(/\s*\([^)]*\)/g, '');
}

function updateActiveFont() {
  const isNgayogyan = (currentPaugeran === 'kawi' || currentPaugeran === 'kaj_tradisional');
  const activeFontFamily = isNgayogyan ? "'Ngayogyan', serif" : "'Ngayogyann', serif";
  const elements = document.querySelectorAll('.aksara-jawa');
  elements.forEach(el => {
    el.style.fontFamily = activeFontFamily;
  });
}

async function loadScriptIsolated(scriptSrc, funcName) {
  try {
    const response = await fetch(scriptSrc);
    if (!response.ok) throw new Error('Fetch failed');
    const code = await response.text();
    const fn = new Function(`
      ${code}
      return typeof ${funcName} !== 'undefined' ? ${funcName} : null;
    `)();
    if (typeof fn === 'function') return fn;
    throw new Error(`Fungsi ${funcName} tidak ditemukan`);
  } catch (e) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><script src="${scriptSrc}"><\/script></head><body></body></html>`);
      doc.close();
      iframe.onload = () => {
        const fn = iframe.contentWindow[funcName];
        if (typeof fn === 'function') {
          resolve(fn.bind(iframe.contentWindow));
        } else {
          reject(new Error(`Fungsi ${funcName} tidak ditemukan di ${scriptSrc}`));
        }
      };
      iframe.onerror = reject;
    });
  }
}

async function loadTransliterators() {
  const scripts = [
    { name: 'transliterasiKBJ', file: 'kbj.js', func: 'transliterasiKalimat' },
    { name: 'transliterasiSriwedari', file: 'sriwedari.js', func: 'transliterasiKalimat' },
    { name: 'transliterasiKawi', file: 'carakawi.js', func: 'transliterateKawi' },
    { name: 'transliterasiSimplified', file: 'simplified.js', func: 'transliterasiKalimat' },
    { name: 'transliterasiTradisional', file: 'tradisional.js', func: 'transliterateKawi' }
  ];

  for (const script of scripts) {
    try {
      const fn = await loadScriptIsolated(script.file, script.func);
      window[script.name] = fn;
    } catch (err) {
      console.error(`Gagal memuat ${script.file}:`, err);
    }
  }
}

function hideScoreModal() {
  const modal = document.getElementById('score-modal');
  if (modal) modal.style.display = 'none';
}

function showScoreModal(soalList) {
  if (!soalList || soalList.length === 0) return;

  let correctCount = 0;
  soalList.forEach((q, qIndex) => {
    if (userAnswers[qIndex] === q.kunci) {
      correctCount++;
    }
  });

  const wrongCount = soalList.length - correctCount;

  // Bahasa Jawa Krama Biasa transliterasi
  const scoreTextLatin = `panjenengan leres ${correctCount} wangsulan lan klentu ${wrongCount} wangsulan.`;
  const fractionTextLatin = `${correctCount}/${soalList.length}`;

  const scoreTextEl = document.getElementById('modal-score-text');
  const fractionEl = document.getElementById('modal-score-fraction');
  const nextBtnEl = document.getElementById('modal-next-btn');
  const modal = document.getElementById('score-modal');

  if (scoreTextEl) scoreTextEl.textContent = convertToAksara(scoreTextLatin);
  if (fractionEl) fractionEl.textContent = convertToAksara(fractionTextLatin);
  if (nextBtnEl) nextBtnEl.textContent = convertToAksara('sabanjur-é');

  if (modal) modal.style.display = 'flex';

  updateActiveFont();
}

document.addEventListener('DOMContentLoaded', async () => {
  const paugeranInputs = document.querySelectorAll('input[name="paugeran"]');
  if (paugeranInputs.length > 0) {
    const checkedInput = document.querySelector('input[name="paugeran"]:checked');
    currentPaugeran = checkedInput ? checkedInput.value : 'kbj';

    paugeranInputs.forEach((input) => {
      input.addEventListener('change', (e) => {
        currentPaugeran = e.target.value;
        renderAll();
      });
    });
  }

  const storySelect = document.getElementById('storySelect');
  if (storySelect) {
    storySelect.addEventListener('change', (e) => {
      currentKasusIndex = parseInt(e.target.value, 10);
      userAnswers = {};
      hideScoreModal();
      renderAll();
    });
  }

  const nextBtn = document.getElementById('next-story-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentKasusIndex < kasusData.length - 1) {
        currentKasusIndex++;
        userAnswers = {};
        hideScoreModal();
        renderAll();
      }
    });
  }

  const modalNextBtn = document.getElementById('modal-next-btn');
  if (modalNextBtn) {
    modalNextBtn.addEventListener('click', () => {
      hideScoreModal();
      if (currentKasusIndex < kasusData.length - 1) {
        currentKasusIndex++;
        userAnswers = {};
        renderAll();
      }
    });
  }

  const latinBtn = document.getElementById('btn-toggle-latin');
  if (latinBtn) {
    latinBtn.addEventListener('click', () => {
      const latinContent = document.getElementById('story-latin-content');
      if (latinContent) {
        const isHidden = latinContent.style.display === 'none' || !latinContent.style.display;
        if (isHidden) {
          startLatinTimer();
        } else {
          stopLatinTimer();
        }
      }
    });
  }

  await loadTransliterators();
  await fetchKasusData();
});

async function fetchKasusData() {
  try {
    const response = await fetch('kasus.json');
    kasusData = await response.json();
    renderAll();
  } catch (error) {
    console.error('Gagal memuat kasus.json:', error);
  }
}

function populateStorySelect() {
  const storySelect = document.getElementById('storySelect');
  if (!storySelect || !kasusData || kasusData.length === 0) return;

  storySelect.innerHTML = '';
  kasusData.forEach((kasus, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = convertToAksara(kasus.judul);
    if (index === currentKasusIndex) {
      opt.selected = true;
    }
    storySelect.appendChild(opt);
  });
}

function renderAll() {
  if (!kasusData || kasusData.length === 0) return;

  stopLatinTimer();

  document.getElementById('ui-title').textContent = convertToAksara("Aplikasi Maca Aksara Jawa");
  document.getElementById('ui-label-paugeran').textContent = convertToAksara("Pilih Pa-uger-an:");
  document.getElementById('ui-label-story').textContent = convertToAksara("Pilih Crita:");
  document.getElementById('ui-questions-title').textContent = convertToAksara("Wangsul-ana Pitakon-Pitakon Ing Ngisor Iki:");
  document.getElementById('next-story-btn').textContent = convertToAksara("Crita Sabanjur-é");

  populateStorySelect();

  const activeKasus = kasusData[currentKasusIndex];

  document.getElementById('story-title').textContent = convertToAksara(activeKasus.judul);

  // Render Gambar dan Teks Cerita Aksara Jawa secara bersamaan
  const storyContentEl = document.getElementById('story-content');
  if (storyContentEl) {
    storyContentEl.innerHTML = '';

    if (activeKasus.gambar) {
      const imgEl = document.createElement('img');
      imgEl.src = activeKasus.gambar;
      imgEl.alt = activeKasus.judul || 'Gambar Crita';
      imgEl.className = 'story-img';
      storyContentEl.appendChild(imgEl);
    }

    const textNode = document.createTextNode(convertToAksara(activeKasus.cerita));
    storyContentEl.appendChild(textNode);
  }

  const latinContent = document.getElementById('story-latin-content');
  if (latinContent) {
    latinContent.textContent = formatLatinText(activeKasus.cerita);
  }

  renderSoal(activeKasus.soal);

  const nextBtn = document.getElementById('next-story-btn');
  if (currentKasusIndex < kasusData.length - 1) {
    nextBtn.style.display = 'block';
  } else {
    nextBtn.style.display = 'none';
  }

  // Jika modal sedang terbuka, re-render teks modal dengan paugeran yang baru dipilih
  const modal = document.getElementById('score-modal');
  if (modal && modal.style.display !== 'none') {
    showScoreModal(activeKasus.soal);
  }

  updateActiveFont();
}

function renderSoal(soalList) {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';

  if (!soalList || !Array.isArray(soalList)) return;

  const prefixes = ['ha. ', 'na. ', 'ca. ', 'ra. '];

  soalList.forEach((q, qIndex) => {
    const qBlock = document.createElement('div');
    qBlock.className = 'question-block';

    const qTitle = document.createElement('div');
    qTitle.className = 'aksara-jawa';
    qTitle.style.fontWeight = 'bold';
    qTitle.textContent = convertToAksara(`${qIndex + 1}. ${q.pertanyaan}`);
    qBlock.appendChild(qTitle);

    const optionsGrid = document.createElement('div');
    optionsGrid.className = 'options-grid';

    q.pilihan.forEach((opt, optIndex) => {
      const optBtn = document.createElement('button');
      optBtn.className = 'option-btn aksara-jawa';
      optBtn.textContent = convertToAksara(`${prefixes[optIndex]}${opt}`);

      const hasAnswered = userAnswers[qIndex] !== undefined;

      if (hasAnswered) {
        optBtn.disabled = true;
        const selectedOpt = userAnswers[qIndex];
        const correctOpt = q.kunci;

        if (optIndex === correctOpt) {
          optBtn.classList.add('correct');
        } else if (optIndex === selectedOpt) {
          optBtn.classList.add('incorrect');
        }
      } else {
        optBtn.addEventListener('click', () => {
          userAnswers[qIndex] = optIndex;
          renderAll();

          // Cek apakah seluruh pertanyaan pada cerita ini sudah dijawab
          if (Object.keys(userAnswers).length === soalList.length) {
            showScoreModal(soalList);
          }
        });
      }

      optionsGrid.appendChild(optBtn);
    });

    qBlock.appendChild(optionsGrid);
    container.appendChild(qBlock);
  });
}
