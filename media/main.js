(function () {
  const canvas = document.getElementById('avatar-canvas');
  const placeholderImg = document.getElementById('placeholder-img');
  const caption = document.getElementById('caption');

  const messages = {
    idle: 'よんだらいつでも来るよ〜',
    thinking: 'おっ、きた！ちょい待って、考えるわ',
    working: '今それやってるとこ！',
    waiting: 'ねぇ、ちょっと確認していい？',
    done: 'できたー！見て見て！'
  };
  const STATE_VALUE = { idle: 0, thinking: 1, working: 2, waiting: 3 };

  let stateInput = null;
  let pendingState = 'idle';
  let lastRealState = 'idle';
  let doneTimer = null;

  const hasRiveFile = !!window.__RIVE_FILE_URL__;
  if (canvas) {
    canvas.style.display = hasRiveFile ? 'block' : 'none';
  }
  if (hasRiveFile) {
    if (placeholderImg) {
      placeholderImg.style.display = 'none';
    }
    window.rive.RuntimeLoader.setWasmUrl(window.__RIVE_WASM_URL__);
    const r = new window.rive.Rive({
      src: window.__RIVE_FILE_URL__,
      canvas: canvas,
      autoplay: true,
      stateMachines: 'Avatar',
      onLoad: function () {
        r.resizeDrawingSurfaceToCanvas();
        const inputs = r.stateMachineInputs('Avatar');
        stateInput = (inputs || []).find(function (i) { return i.name === 'state'; }) || null;
        if (stateInput) {
          stateInput.value = STATE_VALUE[pendingState];
        }
      }
    });
    window.addEventListener('resize', function () {
      r.resizeDrawingSurfaceToCanvas();
    });
  }

  function showMessage(key) {
    if (caption) {
      caption.textContent = messages[key] || messages.idle;
    }
  }

  function setState(state) {
    const s = Object.prototype.hasOwnProperty.call(STATE_VALUE, state) ? state : 'idle';
    pendingState = s;

    if (doneTimer) {
      clearTimeout(doneTimer);
      doneTimer = null;
    }

    if (s === 'idle' && lastRealState !== 'idle') {
      showMessage('done');
      doneTimer = setTimeout(function () {
        showMessage('idle');
        doneTimer = null;
      }, 2500);
    } else {
      showMessage(s);
    }
    lastRealState = s;

    if (stateInput) {
      stateInput.value = STATE_VALUE[s];
    }
  }

  window.addEventListener('message', function (event) {
    const msg = event.data;
    if (msg && msg.type === 'state') {
      setState(msg.state);
    }
  });

  function fitAvatar() {
    document.body.style.width = window.innerWidth + 'px';
    document.body.style.height = window.innerHeight + 'px';

    const captionH = caption ? caption.offsetHeight : 0;
    const availableH = window.innerHeight - captionH - 32;
    const target = Math.max(80, Math.min(480, availableH));
    if (canvas) {
      canvas.style.height = target + 'px';
    }
    if (placeholderImg) {
      placeholderImg.style.maxHeight = target + 'px';
    }
  }

  window.addEventListener('resize', fitAvatar);
  fitAvatar();

  setState('idle');
})();
