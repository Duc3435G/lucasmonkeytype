// ==UserScript==
// @name         Keymash [Normal] - Lucass
// @namespace    http://tampermonkey.net/
// @version      36.67
// @description  Sài chùa à
// @author       Lucass
// @match        https://keymash.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let isPanelExpanded   = false;
    let isScriptEnabled   = false;
    let isPanelVisible    = false;
    let normalCharIndex   = 0;
    let originalText      = "";
    let erroredText       = "";
    let lastKeyTime       = 0;
    let errorCorrectionState = null;
    let skipNextErrorInjection = false;

    // ===== THÊM BIẾN CHO HÀM LẶP =====
    let isLooping = false;          // Trạng thái lặp
    let loopIntervalId = null;      // ID của interval lặp
    let loopDelay = 50;             // Độ trễ giữa các lần gõ (ms)
    let currentLoopCharIndex = 0;   // Vị trí trong chuỗi khi lặp

    const panel = document.createElement('div');
    Object.assign(panel.style, {
        position: 'absolute',
        top: '50px',
        left: '50px',
        width: '280px',
        height: '35px',
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '16px',
        zIndex: '9999',
        display: 'none',
        flexDirection: 'column',
        padding: '8px',
        transform: 'scale(0.8)',
        opacity: '0',
        transition: 'transform 0.25s ease, opacity 0.25s ease, height 0.25s ease'
    });
    panel.tabIndex = -1;
    document.body.appendChild(panel);

    const topCont = document.createElement('div');
    Object.assign(topCont.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'move'
    });
    panel.appendChild(topCont);

    // ===== THÊM NÚT BẬT/TẮT LẶP =====
    const loopToggleCont = document.createElement('div');
    Object.assign(loopToggleCont.style, {
        width: '36px',
        height: '18px',
        borderRadius: '9px',
        backgroundColor: 'rgba(200,200,200,0.3)',
        position: 'relative',
        backdropFilter: 'blur(4px)',
        transition: 'background 0.25s ease',
        marginLeft: '8px'
    });
    const loopToggleCircle = document.createElement('div');
    Object.assign(loopToggleCircle.style, {
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: 'rgba(240,240,240,0.9)',
        position: 'absolute',
        top: '1px',
        left: '1px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'transform 0.25s ease'
    });
    loopToggleCont.appendChild(loopToggleCircle);
    // Thêm nhãn cho nút lặp
    const loopLabel = document.createElement('span');
    loopLabel.textContent = '🔄';
    loopLabel.style.cssText = 'color: #fff; font-size: 14px; margin-left: 4px;';
    const loopWrapper = document.createElement('div');
    loopWrapper.style.cssText = 'display: flex; align-items: center;';
    loopWrapper.appendChild(loopLabel);
    loopWrapper.appendChild(loopToggleCont);

    const togCont = document.createElement('div');
    Object.assign(togCont.style, {
        width: '36px',
        height: '18px',
        borderRadius: '9px',
        backgroundColor: 'rgba(200,200,200,0.3)',
        position: 'relative',
        backdropFilter: 'blur(4px)',
        transition: 'background 0.25s ease'
    });
    const togCircle = document.createElement('div');
    Object.assign(togCircle.style, {
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: 'rgba(240,240,240,0.9)',
        position: 'absolute',
        top: '1px',
        left: '1px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'transform 0.25s ease'
    });
    togCont.appendChild(togCircle);

    // Sắp xếp lại topCont
    const leftGroup = document.createElement('div');
    leftGroup.style.cssText = 'display: flex; align-items: center; gap: 6px;';
    leftGroup.appendChild(togCont);
    leftGroup.appendChild(loopWrapper);
    topCont.appendChild(leftGroup);

    const resizeBtn = document.createElement('button');
    resizeBtn.textContent = '+';
    Object.assign(resizeBtn.style, {
        background: 'none',
        border: 'none',
        fontSize: '18px',
        color: '#fff',
        cursor: 'pointer',
        padding: '4px'
    });
    topCont.appendChild(resizeBtn);

    const inputsCont = document.createElement('div');
    Object.assign(inputsCont.style, {
        display: 'none',
        flexDirection: 'column',
        marginTop: '8px'
    });
    panel.appendChild(inputsCont);

    function createInput(labelText, defaultValue, id) {
        const grp = document.createElement('div');
        grp.style.marginBottom = '10px';
        const lbl = document.createElement('label');
        lbl.textContent = labelText;
        Object.assign(lbl.style, {
            color: '#fff',
            fontSize: '14px',
            marginBottom: '4px',
            display: 'block'
        });
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.value = defaultValue;
        inp.id = id;
        Object.assign(inp.style, {
            width: '100%',
            padding: '6px',
            fontSize: '14px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            color: '#fff',
            outline: 'none'
        });
        inp.addEventListener('mousedown', function(e) { e.stopPropagation(); });
        inp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                inp.blur();
                e.stopPropagation();
            }
        });
        grp.appendChild(lbl);
        grp.appendChild(inp);
        return grp;
    }

    const inputs = {
        errorChance: createInput('Error chance (%)', 0, 'errorChance'),
        neighborChars: createInput('Neighbor swap (%)', 0, 'neighborChars'),
        swapChars: createInput('Swap letters (%)', 0, 'swapChars'),
        wpmInput: createInput('WPM', 300, 'wpmInput'),
        // ===== THÊM INPUT ĐIỀU CHỈNH TỐC ĐỘ LẶP =====
        loopDelayInput: createInput('Loop delay (ms)', 1, 'loopDelayInput')
    };
    Object.values(inputs).forEach(g => inputsCont.appendChild(g));

    function showPanel() {
        panel.style.display = 'flex';
        requestAnimationFrame(() => {
            panel.style.transform = 'scale(1)';
            panel.style.opacity = '1';
            panel.focus();
        });
    }

    function hidePanel() {
        panel.style.transform = 'scale(0.8)';
        panel.style.opacity = '0';
        panel.addEventListener('transitionend', function onEnd() {
            panel.removeEventListener('transitionend', onEnd);
            if (!isPanelVisible) {
                panel.style.display = 'none';
                document.body.focus();
            }
        });
    }

    // ===== SỬA LỖI PHẦN I: GẮN ĐÚNG SỰ KIỆN =====
    // Toggle bật/tắt script
    togCont.addEventListener('click', function(e) {
        e.stopPropagation();
        isScriptEnabled = !isScriptEnabled;
        togCircle.style.transform = isScriptEnabled ? 'translateX(18px)' : 'translateX(0)';
        togCont.style.backgroundColor = isScriptEnabled
            ? 'rgba(80,80,80,0.6)' : 'rgba(200,200,200,0.3)';
        // Nếu tắt script thì cũng tắt lặp
        if (!isScriptEnabled && isLooping) {
            stopLooping();
        }
    });

    // ===== THÊM SỰ KIỆN CHO NÚT LẶP =====
    loopToggleCont.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!isScriptEnabled) {
            // Nếu script chưa bật, tự động bật script trước
            isScriptEnabled = true;
            togCircle.style.transform = 'translateX(18px)';
            togCont.style.backgroundColor = 'rgba(80,80,80,0.6)';
        }
        // Chuyển trạng thái lặp
        if (isLooping) {
            stopLooping();
        } else {
            startLooping();
        }
    });

    resizeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        isPanelExpanded = !isPanelExpanded;
        resizeBtn.textContent = isPanelExpanded ? '−' : '+';
        if (isPanelExpanded) {
            inputsCont.style.display = 'flex';
            panel.style.height = inputsCont.scrollHeight + topCont.offsetHeight + 16 + 'px';
        } else {
            inputsCont.style.display = 'none';
            panel.style.height = '50px';
        }
    });

    let dragging = false, offX = 0, offY = 0;
    topCont.addEventListener('mousedown', function(e) {
        if (e.target.closest('button') || e.target.closest('input')) return;
        dragging = true;
        offX = e.clientX - panel.getBoundingClientRect().left;
        offY = e.clientY - panel.getBoundingClientRect().top;
    });
    document.addEventListener('mousemove', function(e) {
        if (dragging) {
            panel.style.left = (e.clientX - offX) + 'px';
            panel.style.top = (e.clientY - offY) + 'px';
        }
    });
    document.addEventListener('mouseup', function() { dragging = false; });

    // ===== SỬA LỖI PHẦN I: THAY ĐỔI CÁCH BẮT SỰ KIỆN PHÍM =====
    document.addEventListener('keydown', function(e) {
        // Phím F8 để hiển thị panel
        if (e.key === 'F8') {
            e.preventDefault();
            isPanelVisible = !isPanelVisible;
            if (isPanelVisible) {
                showPanel();
                isPanelExpanded = false;
                resizeBtn.textContent = '+';
                inputsCont.style.display = 'none';
                panel.style.height = '50px';
            } else {
                hidePanel();
            }
            return;
        }

        // ===== SỬA LỖI PHẦN I: XỬ LÝ PHÍM CHÍNH XÁC =====
        // Chỉ xử lý nếu script được bật, không phải từ panel, và không phải phím điều khiển đặc biệt
        if (!isScriptEnabled) return;
        if (panel.contains(e.target)) return;
        if (e.key === 'F8') return;

        // Ngăn chặn hành vi mặc định cho tất cả phím (trừ F8 đã xử lý)
        e.preventDefault();
        e.stopPropagation();

        // Nếu đang ở chế độ lặp, không xử lý keydown thủ công (loop đã xử lý)
        if (isLooping) {
            return;
        }

        // Xử lý phím
        throttledKeyPress(e.key);
    }, true); // Capture phase để bắt trước các handler khác

    function getTextFromDOM() {
        const textContainer = document.querySelector('.match--container.match--ltr .match--text');
        if (!textContainer) return "";
        const letterSpans = textContainer.querySelectorAll('span.match--letter');
        let text = "";
        letterSpans.forEach(span => {
            text += span.textContent;
        });
        return text.trim();
    }

    function generateErroredText(original) {
        const eChance = parseFloat(document.getElementById('errorChance').value) / 100;
        const words = original.split(/\s+/).filter(Boolean);
        const resultWords = words.map(w => (Math.random() < eChance ? shuffleWord(w) : w));
        return resultWords.join(' ') + ' ';
    }

    function shuffleWord(word) {
        let arr = word.split('');
        const neighborChance = parseFloat(document.getElementById('neighborChars').value) / 100;
        const swapChance = parseFloat(document.getElementById('swapChars').value) / 100;
        if (Math.random() < neighborChance && arr.length > 0) {
            let i = Math.floor(Math.random() * arr.length);
            let c = arr[i].toLowerCase();
            const neighbors = adjacentKeys[c] || [];
            if (neighbors.length > 0) {
                let r = neighbors[Math.floor(Math.random() * neighbors.length)];
                arr[i] = isUpperCase(arr[i]) ? r.toUpperCase() : r;
            }
        }
        if (Math.random() < swapChance && arr.length > 1) {
            let i = Math.floor(Math.random() * (arr.length - 1));
            [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        }
        return arr.join('');
    }

    function isUpperCase(ch) {
        return ch === ch.toUpperCase() && ch !== ch.toLowerCase();
    }

    const adjacentKeys = {
        '1': ['`','2'],'2': ['1','3'],'3': ['2','4'],
        '4': ['3','5'],'5': ['4','6'],'6': ['5','7'],
        '7': ['6','8'],'8': ['7','9'],'9': ['8','0'],
        '0': ['-','9'],
        'q': ['w','1'],'w': ['q','e','2'],'e': ['w','r','3'],
        'r': ['e','t','4'],'t': ['r','y','5'],'y': ['t','u','6'],
        'u': ['y','i','7'],'i': ['u','o','8'],'o': ['i','p','9'],
        'p': ['o','0','['],
        'a': ['s','q'], 's': ['a','d','w'],'d': ['s','f','e'],
        'f': ['d','g','r'],'g': ['f','h','t'],'h': ['g','j','y'],
        'j': ['h','k','u'],'k': ['j','l','i'],'l': ['k',';','o'],
        ';': ['l','p'],
        'z': ['x','a'],'x': ['z','c','s'],'c': ['x','v','d'],
        'v': ['c','b','f'],'b': ['v','n','g'],'n': ['b','m','h'],
        'm': ['n',',','j'],',': ['m','.','k'],'.': [',','/','l'],
        '/': ['.',';'],
        'й': ['ц','1'], 'ц': ['й','у','2'],'у': ['ц','к','3'],
        'к': ['у','е','4'],'е': ['к','н','5'],'н': ['е','г','6'],
        'г': ['н','ш','7'],'ш': ['г','щ','8'],'щ': ['ш','з','9'],
        'з': ['щ','х','0'],'х': ['з','ъ','-'],'ъ': ['х','='],
        'ф': ['ы','й'],'ы': ['ф','в','ц'],'в': ['ы','а','у'],
        'а': ['в','п','к'],'п': ['а','р','е'],'р': ['п','о','н'],
        'о': ['р','л','г'],'л': ['о','д','ш'],'д': ['л','ж','щ'],
        'ж': ['д','э','з'],'э': ['ж','ъ'],
        'я': ['ч','ф'],'ч': ['я','с','ы'],'с': ['ч','м','в'],
        'м': ['с','и','а'],'и': ['м','т','п'],'т': ['и','ь','р'],
        'ь': ['т','б','о'],'б': ['ь','ю','л'],'ю': ['б','.','д'],
        '.': ['ю','ж','э']
    };

    function insertCharacter(ch) {
        const input = document.querySelector('.match--input');
        if (!input) return;
        input.focus();
        document.execCommand('insertText', false, ch);
    }

    function simulateBackspace() {
        const input = document.querySelector('.match--input');
        if (!input) return;
        input.focus();
        document.execCommand('delete');
    }

    setInterval(function() {
        const current = getTextFromDOM();
        if (current && current !== originalText) {
            originalText            = current;
            erroredText             = generateErroredText(current);
            normalCharIndex         = 0;
            currentLoopCharIndex    = 0;
            errorCorrectionState    = null;
            skipNextErrorInjection  = false;
        }
    }, 300);

    function processNormalKey(key) {
        if (!errorCorrectionState && skipNextErrorInjection) {
            insertCharacter(originalText[normalCharIndex]);
            normalCharIndex++;
            skipNextErrorInjection = false;
            return;
        }

        if (['Tab', 'Escape', 'Enter'].includes(key)) {
            normalCharIndex = 0;
            erroredText = "";
            errorCorrectionState = null;
            return;
        }
        if (key === 'Backspace') {
            normalCharIndex = Math.max(0, normalCharIndex - 1);
            errorCorrectionState = null;
            return;
        }

        if (errorCorrectionState !== null) {
            if (errorCorrectionState.correctionInProgress) {
                if (normalCharIndex > errorCorrectionState.errorStartIndex) {
                    simulateBackspace();
                    normalCharIndex--;
                    return;
                } else {
                    insertCharacter(originalText[errorCorrectionState.errorStartIndex]);
                    normalCharIndex = errorCorrectionState.errorStartIndex + 1;
                    errorCorrectionState = null;
                    skipNextErrorInjection = true;
                    return;
                }
            } else {
                if (errorCorrectionState.typedAfterError < errorCorrectionState.threshold) {
                    errorCorrectionState.typedAfterError++;
                    if (normalCharIndex < erroredText.length) {
                        insertCharacter(erroredText[normalCharIndex]);
                        normalCharIndex++;
                    }
                    return;
                } else {
                    errorCorrectionState.correctionInProgress = true;
                    simulateBackspace();
                    if (normalCharIndex > errorCorrectionState.errorStartIndex) {
                        normalCharIndex--;
                    }
                    return;
                }
            }
        }

        if (normalCharIndex < erroredText.length && normalCharIndex < originalText.length) {
            let errChar = erroredText[normalCharIndex];
            let origChar = originalText[normalCharIndex];
            if (origChar === ' ') {
                insertCharacter(' ');
                normalCharIndex++;
                return;
            }
            if (errChar !== origChar) {
                errorCorrectionState = {
                    errorStartIndex: normalCharIndex,
                    typedAfterError: 0,
                    threshold: (Math.random() < 0.7)
                        ? Math.floor(Math.random() * 3) + 3
                        : Math.floor(Math.random() * 3) + 7,
                    correctionInProgress: false
                };
                insertCharacter(errChar);
                normalCharIndex++;
                return;
            } else {
                insertCharacter(origChar);
                normalCharIndex++;
                return;
            }
        }
    }

    function throttledKeyPress(key) {
        const wpmValue = parseFloat(document.getElementById('wpmInput').value) || 300;
        const minInterval = 60000 / (wpmValue * 5);
        const now = performance.now();
        const diff = now - lastKeyTime;
        if (diff >= minInterval) {
            lastKeyTime = now;
            processNormalKey(key);
        } else {
            const delay = minInterval - diff;
            lastKeyTime += minInterval;
            setTimeout(function() { processNormalKey(key); }, delay);
        }
    }

    // ===== HÀM LẶP TỰ ĐỘNG =====
    function startLooping() {
        if (isLooping) return;
        if (!originalText || originalText.length === 0) {
            // Thử lấy text từ DOM
            const current = getTextFromDOM();
            if (current) {
                originalText = current;
                erroredText = generateErroredText(current);
                normalCharIndex = 0;
                currentLoopCharIndex = 0;
            } else {
                return;
            }
        }

        isLooping = true;
        loopToggleCircle.style.transform = 'translateX(18px)';
        loopToggleCont.style.backgroundColor = 'rgba(80,80,80,0.6)';

        // Reset chỉ số
        normalCharIndex = 0;
        currentLoopCharIndex = 0;
        errorCorrectionState = null;
        skipNextErrorInjection = false;

        // Lấy tốc độ lặp từ input
        const delayInput = document.getElementById('loopDelayInput');
        loopDelay = delayInput ? parseInt(delayInput.value, 10) || 50 : 50;

        // Tạo interval lặp
        loopIntervalId = setInterval(function() {
            if (!isLooping) {
                clearInterval(loopIntervalId);
                loopIntervalId = null;
                return;
            }

            // Kiểm tra nếu đã gõ xong văn bản
            if (normalCharIndex >= originalText.length) {
                // Reset để lặp lại
                normalCharIndex = 0;
                currentLoopCharIndex = 0;
                errorCorrectionState = null;
                skipNextErrorInjection = false;
                // Đảm bảo focus vào input
                const input = document.querySelector('.match--input');
                if (input) input.focus();
                return;
            }

            // Lấy ký tự tiếp theo từ originalText (không dùng erroredText khi lặp)
            const nextChar = originalText[normalCharIndex];
            if (nextChar === undefined || nextChar === '') {
                normalCharIndex++;
                return;
            }

            // Xử lý lỗi nếu có (áp dụng tỷ lệ lỗi từ settings)
            const eChance = parseFloat(document.getElementById('errorChance').value) / 100;
            let charToType = nextChar;

            // Nếu ký tự là dấu cách, gõ trực tiếp
            if (nextChar === ' ') {
                insertCharacter(' ');
                normalCharIndex++;
                return;
            }

            // Tạo lỗi ngẫu nhiên (chỉ khi đang không trong trạng thái sửa lỗi)
            if (errorCorrectionState === null && Math.random() < eChance) {
                // Tạo lỗi: thay thế bằng phím lân cận hoặc hoán đổi
                let word = getCurrentWord(originalText, normalCharIndex);
                if (word && word.length > 0) {
                    let shuffled = shuffleWord(word);
                    // Lấy ký tự tại vị trí tương đối trong từ
                    let relIndex = normalCharIndex - getWordStartIndex(originalText, normalCharIndex);
                    if (relIndex < shuffled.length) {
                        charToType = shuffled[relIndex];
                    }
                    // Tạo trạng thái lỗi để tự sửa sau
                    errorCorrectionState = {
                        errorStartIndex: normalCharIndex,
                        typedAfterError: 0,
                        threshold: (Math.random() < 0.7) ? Math.floor(Math.random() * 3) + 3 : Math.floor(Math.random() * 3) + 7,
                        correctionInProgress: false
                    };
                }
            }

            // Gõ ký tự
            insertCharacter(charToType);
            normalCharIndex++;

            // Nếu đang trong trạng thái lỗi, tăng biến đếm
            if (errorCorrectionState !== null && !errorCorrectionState.correctionInProgress) {
                errorCorrectionState.typedAfterError++;
                // Kiểm tra nếu đã vượt ngưỡng thì bắt đầu sửa
                if (errorCorrectionState.typedAfterError >= errorCorrectionState.threshold) {
                    // Thực hiện sửa lỗi: backspace về vị trí lỗi
                    const startIdx = errorCorrectionState.errorStartIndex;
                    let currentIdx = normalCharIndex;
                    // Xóa các ký tự sai
                    while (currentIdx > startIdx) {
                        simulateBackspace();
                        currentIdx--;
                        normalCharIndex--;
                    }
                    // Gõ lại ký tự đúng
                    if (startIdx < originalText.length) {
                        insertCharacter(originalText[startIdx]);
                        normalCharIndex = startIdx + 1;
                    }
                    errorCorrectionState = null;
                    skipNextErrorInjection = true;
                }
            } else if (errorCorrectionState !== null && errorCorrectionState.correctionInProgress) {
                // Đang trong quá trình sửa, không làm gì
            }

        }, loopDelay);
    }

    function stopLooping() {
        isLooping = false;
        if (loopIntervalId) {
            clearInterval(loopIntervalId);
            loopIntervalId = null;
        }
        loopToggleCircle.style.transform = 'translateX(0)';
        loopToggleCont.style.backgroundColor = 'rgba(200,200,200,0.3)';
        // Reset trạng thái
        errorCorrectionState = null;
        skipNextErrorInjection = false;
    }

    // Hàm trợ giúp lấy từ hiện tại
    function getCurrentWord(text, index) {
        const words = text.split(/\s+/);
        let charCount = 0;
        for (let i = 0; i < words.length; i++) {
            charCount += words[i].length;
            if (index < charCount) {
                return words[i];
            }
            // Cộng thêm dấu cách
            charCount++;
            if (index < charCount) {
                return words[i];
            }
        }
        return null;
    }

    function getWordStartIndex(text, index) {
        const words = text.split(/\s+/);
        let charCount = 0;
        for (let i = 0; i < words.length; i++) {
            if (index < charCount + words[i].length) {
                return charCount;
            }
            charCount += words[i].length + 1; // +1 cho dấu cách
        }
        return 0;
    }

    // ===== KHỞI TẠO BAN ĐẦU =====
    // Đảm bảo panel không chiếm sự kiện
    panel.addEventListener('keydown', function(e) {
        e.stopPropagation();
    });

    console.log('Keymash [Hacker] - Đã tải thành công với hàm lặp!');
    console.log('F8 để mở panel, bật script và bật chế độ lặp để tự động gõ.');

})();
