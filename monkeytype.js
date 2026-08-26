// ==UserScript==
// @name         Monkeytype Auto - Lucasss
// @namespace    http://tampermonkey.net/
// @version      36.67
// @description  Hack monkeytype
// @author       Lucas Dev
// @match        https://monkeytype.com/*
// @match        https://dev.monkeytype.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var isActive = false;
    var intervalId = null;
    var debugLog = [];

    function log(msg) {
        debugLog.push(msg);
        console.log('[MT] ' + msg);
    }

    // Tạo UI
    var panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;background:#1e1e2e;color:#fff;padding:12px 16px;border-radius:12px;border:1px solid #444;font-family:Arial,sans-serif;font-size:13px;min-width:200px;box-shadow:0 4px 20px rgba(0,0,0,0.8);';
    panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-weight:bold;color:#bd93f9;">⚡ Auto</span>
            <div id="mt-toggle" style="width:40px;height:22px;border-radius:11px;background:#444;position:relative;cursor:pointer;transition:0.3s;">
                <div id="mt-knob" style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:0.3s;"></div>
            </div>
        </div>
        <div style="margin-top:8px;font-size:11px;color:#8be9fd;" id="mt-status">Sẵn sàng (F8)</div>
        <div style="margin-top:4px;font-size:10px;color:#6272a4;" id="mt-debug"></div>
    `;
    document.body.appendChild(panel);

    var toggle = document.getElementById('mt-toggle');
    var knob = document.getElementById('mt-knob');
    var status = document.getElementById('mt-status');
    var debugEl = document.getElementById('mt-debug');

    // Bật/tắt bằng F8
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F8') {
            e.preventDefault();
            if (panel.style.display === 'none') {
                panel.style.display = 'block';
                status.textContent = 'Đã hiện';
            } else {
                panel.style.display = 'none';
            }
        }
    });

    toggle.addEventListener('click', function() {
        isActive = !isActive;
        if (isActive) {
            knob.style.transform = 'translateX(18px)';
            toggle.style.background = '#50fa7b';
            status.textContent = 'Đang khởi động...';
            log('BẬT script');
            startAuto();
        } else {
            knob.style.transform = 'translateX(0)';
            toggle.style.background = '#444';
            status.textContent = 'Dừng';
            log('TẮT script');
            stopAuto();
        }
    });

    // ===== TÌM INPUT =====
    function findInput() {
        var input = document.querySelector('.match--input');
        if (input) {
            log('Tìm thấy .match--input');
            return input;
        }
        input = document.querySelector('#wordsInput');
        if (input) {
            log('Tìm thấy #wordsInput');
            return input;
        }
        input = document.querySelector('input[type="text"]');
        if (input) {
            log('Tìm thấy input[type="text"]');
            return input;
        }
        input = document.querySelector('textarea');
        if (input) {
            log('Tìm thấy textarea');
            return input;
        }
        // Tìm bất kỳ input nào
        input = document.querySelector('input');
        if (input) {
            log('Tìm thấy input: ' + input.className);
            return input;
        }
        log('KHÔNG TÌM THẤY INPUT!');
        return null;
    }

    // ===== LẤY KÝ TỰ TIẾP THEO =====
    function getNextChar() {
        var words = document.querySelectorAll('.word');
        if (!words || words.length === 0) {
            log('Không tìm thấy .word');
            return null;
        }

        log('Tìm thấy ' + words.length + ' từ');

        // Tìm từ active
        var activeWord = null;
        var activeIndex = -1;
        for (var i = 0; i < words.length; i++) {
            if (words[i].classList.contains('active')) {
                activeWord = words[i];
                activeIndex = i;
                log('Từ active: ' + activeIndex);
                break;
            }
        }

        // Nếu không có từ active, lấy từ đầu tiên chưa gõ hết
        if (!activeWord) {
            log('Không có từ active, tìm từ đầu tiên');
            for (var i2 = 0; i2 < words.length; i2++) {
                var letters = words[i2].querySelectorAll('letter');
                for (var j = 0; j < letters.length; j++) {
                    if (!letters[j].classList.contains('correct') && !letters[j].classList.contains('incorrect')) {
                        var char = letters[j].textContent || ' ';
                        log('Ký tự từ từ không active: "' + char + '"');
                        return { char: char };
                    }
                }
            }
            return null;
        }

        // Xử lý từ active
        var activeLetters = activeWord.querySelectorAll('letter');
        if (!activeLetters || activeLetters.length === 0) {
            log('Từ active không có letter');
            return null;
        }

        // Tìm ký tự chưa gõ trong từ active
        for (var k = 0; k < activeLetters.length; k++) {
            if (!activeLetters[k].classList.contains('correct') && !activeLetters[k].classList.contains('incorrect')) {
                var char2 = activeLetters[k].textContent || ' ';
                log('Ký tự tiếp theo trong từ active: "' + char2 + '" tại vị trí ' + k);
                return { char: char2 };
            }
        }

        // Từ active đã gõ hết, kiểm tra cần dấu cách
        log('Từ active đã gõ hết, kiểm tra dấu cách');
        var allTyped = true;
        for (var m = 0; m < activeLetters.length; m++) {
            if (!activeLetters[m].classList.contains('correct') && !activeLetters[m].classList.contains('incorrect')) {
                allTyped = false;
                break;
            }
        }

        if (allTyped && activeLetters.length > 0) {
            var nextWord = words[activeIndex + 1];
            if (nextWord) {
                var nextLetters = nextWord.querySelectorAll('letter');
                if (nextLetters && nextLetters.length > 0) {
                    var hasTyped = false;
                    for (var n = 0; n < nextLetters.length; n++) {
                        if (nextLetters[n].classList.contains('correct') || nextLetters[n].classList.contains('incorrect')) {
                            hasTyped = true;
                            break;
                        }
                    }
                    if (!hasTyped) {
                        log('Cần gõ dấu cách');
                        return { char: ' ' };
                    }
                }
            }
        }

        // Kiểm tra tất cả từ còn lại
        for (var i3 = 0; i3 < words.length; i3++) {
            var letters2 = words[i3].querySelectorAll('letter');
            for (var j2 = 0; j2 < letters2.length; j2++) {
                if (!letters2[j2].classList.contains('correct') && !letters2[j2].classList.contains('incorrect')) {
                    var char3 = letters2[j2].textContent || ' ';
                    log('Ký tự dự phòng: "' + char3 + '"');
                    return { char: char3 };
                }
            }
        }

        log('Không còn ký tự nào');
        return null;
    }

    // ===== GÕ KÝ TỰ =====
    function typeChar(char) {
        var input = findInput();
        if (!input) {
            log('Không có input để gõ');
            return false;
        }

        try {
            input.focus();
            input.click();
            document.execCommand('insertText', false, char);
            log('Đã gõ: "' + char + '"');
            return true;
        } catch(e) {
            log('execCommand lỗi: ' + e.message);
            try {
                input.focus();
                var evt = new InputEvent('input', {
                    inputType: 'insertText',
                    data: char,
                    bubbles: true,
                    cancelable: true,
                    composed: true
                });
                input.dispatchEvent(evt);
                log('Đã gõ (event): "' + char + '"');
                return true;
            } catch(e2) {
                log('Tất cả lỗi: ' + e2.message);
                return false;
            }
        }
    }

    // ===== KIỂM TRA HOÀN THÀNH =====
    function isComplete() {
        var words = document.querySelectorAll('.word');
        if (!words || words.length === 0) return true;
        for (var i = 0; i < words.length; i++) {
            var letters = words[i].querySelectorAll('letter');
            for (var j = 0; j < letters.length; j++) {
                if (!letters[j].classList.contains('correct') && !letters[j].classList.contains('incorrect')) {
                    return false;
                }
            }
        }
        return true;
    }

    // ===== CHẠY TỰ ĐỘNG =====
    function startAuto() {
        stopAuto();

        // Kiểm tra input
        var input = findInput();
        if (!input) {
            status.textContent = '❌ Không tìm thấy input!';
            log('LỖI: Không tìm thấy input');
            isActive = false;
            knob.style.transform = 'translateX(0)';
            toggle.style.background = '#444';
            return;
        }

        // Kiểm tra từ
        var first = getNextChar();
        if (!first) {
            status.textContent = '❌ Không có từ để gõ!';
            log('LỖI: Không có từ');
            isActive = false;
            knob.style.transform = 'translateX(0)';
            toggle.style.background = '#444';
            return;
        }

        status.textContent = '▶ Đang chạy...';
        log('Bắt đầu loop');

        // Gõ ký tự đầu
        typeChar(first.char);

        intervalId = setInterval(function() {
            if (!isActive) {
                log('isActive=false, dừng');
                stopAuto();
                return;
            }

            if (isComplete()) {
                status.textContent = '✅ Hoàn thành!';
                log('Hoàn thành!');
                isActive = false;
                knob.style.transform = 'translateX(0)';
                toggle.style.background = '#444';
                stopAuto();
                return;
            }

            var next = getNextChar();
            if (next) {
                typeChar(next.char);
            } else {
                // Thử lại
                log('Không có ký tự, thử lại');
                var retry = getNextChar();
                if (retry) {
                    typeChar(retry.char);
                } else {
                    // Kiểm tra xem đã xong chưa
                    if (isComplete()) {
                        status.textContent = '✅ Hoàn thành!';
                        isActive = false;
                        knob.style.transform = 'translateX(0)';
                        toggle.style.background = '#444';
                        stopAuto();
                    }
                }
            }
        }, 5);
    }

    function stopAuto() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        log('Dừng loop');
    }

    // ===== HIỂN THỊ DEBUG =====
    setInterval(function() {
        if (debugEl) {
            var lastLogs = debugLog.slice(-3).join(' | ');
            debugEl.textContent = lastLogs;
        }
    }, 1000);

    log('Script đã tải! Nhấn F8 để hiển thị panel');
    status.textContent = 'Sẵn sàng (F8)';

    // Tự động hiện panel
    setTimeout(function() {
        panel.style.display = 'block';
        log('Panel đã hiện');
    }, 1000);

})();
