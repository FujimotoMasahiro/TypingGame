const originalTextElement = document.getElementById('original-text-span');
const comparisonTextElement = document.getElementById('comparison-text-span');
const keybordbuffTextElement = document.getElementById('keybordbuff-text-span');
const mistakeSound = document.getElementById('mistake-sound');

let hiraganaRomaji;
let romajiHiragana;
let lyrics;
let currentPosition = {
    line: 0,
    index: 0
};
let buffer = ''; // ひらがな入力を一時的に保持するバッファ

document.addEventListener('DOMContentLoaded', async () => {
    // 必要なJSONを取得
    hiraganaRomaji = await loadJson('hiragana_romaji.json');
    romajiHiragana = await loadJson('romaji_hiragana.json');
    lyrics = await loadJson('アイドル_YOASOBI.json');

    //　原文とターゲット文をセットする
    originalTextElement.textContent = lyrics.lyrics[currentPosition.line].original;
    comparisonTextElement.textContent = lyrics.lyrics[currentPosition.index].rubi;

    document.addEventListener('keydown', (event) => {
        const key = event.key;
        if (event.key.length === 1 && event.key.match(/[a-zA-Z!"#$%&'()¥\-?,.<>\[\]]/i)) {
            // ターゲット文字を取得する
            let targetChar = comparisonTextElement.textContent.charAt(currentPosition.index);
            //　促音の場合は次の文字もターゲット文字
            targetChar = targetChar === 'っ' ? targetChar + comparisonTextElement.textContent.charAt(currentPosition.index + 1) : targetChar
            //　「ゃ、ゅ、ょ」の拗音判定
            if (hiraganaRomaji[targetChar + comparisonTextElement.textContent.charAt(currentPosition.index + 1)]) {
                targetChar = targetChar + comparisonTextElement.textContent.charAt(currentPosition.index + 1)
            }
            if (checkInput(key, targetChar)) {
                // ターゲット文章を全てタイピングした場合、次の文章に更新する
                // next()
                if (comparisonTextElement.textContent.length === currentPosition.index) {
                    currentPosition.index = 0;
                    currentPosition.line++;

                    originalTextElement.textContent = lyrics.lyrics[currentPosition.line].original;
                    comparisonTextElement.textContent = lyrics.lyrics[currentPosition.line].rubi;
                }
                updateComparisonText();
            };
        }
    });

    /**
     * 入力チェックを行う
     *
     * @param {String} key：入力されたキー
     * @param {String} targetChar：ターゲット文字
     */
    function checkInput(key, targetChar) {

        if (isHiragana(targetChar)) {
            // ターゲットがひらがなの場合
            buffer += key.toLowerCase(); // 入力された文字をバッファに追加
            const hiragana = convertToHiragana(buffer);

            if (isHiragana(hiragana) && (hiragana.some(prefix => prefix.startsWith(targetChar)) || hiragana.join('') === targetChar)) {
                // 入力が正しい場合、バッファをクリアして次に進む
                currentPosition.index = currentPosition.index + targetChar.length;
                buffer = ''; // バッファをクリア
                keybordbuffTextElement.textContent = buffer;
                return true;
            } else if (!convertToRomaji(targetChar).some(prefix => prefix.startsWith(hiragana))) {
                // 子音の段階で間違っている場合、バッファをクリア
                mistakeSound.play();
                buffer = ''; // バッファをクリア
                keybordbuffTextElement.textContent = buffer;
            } else if (buffer.length >= 4) {
                // 4文字以上の入力でまだ正しくない場合もバッファをクリア
                mistakeSound.play();
                buffer = ''; // バッファをクリア
                keybordbuffTextElement.textContent = buffer;
            }
            keybordbuffTextElement.textContent = buffer;
        } else if (key.toLowerCase() === targetChar.toLowerCase()) {
            // ターゲットがローマ字の場合でキー入力と一致している場合
            currentPosition.index++;
            buffer = ''; // バッファをクリア
            keybordbuffTextElement.textContent = buffer;
            return true;

        } else if (key.match(/[a-zA-Z!"#$%&'()¥\-?,.<>\[\]]/i)) {
            if (key === toHalfWidth(targetChar) || key === convertToHalfWidth(targetChar)) {
                // 入力が正しい場合、バッファをクリアして次に進む
                currentPosition.index = currentPosition.index + targetChar.length;
                buffer = ''; // バッファをクリア
                keybordbuffTextElement.textContent = buffer;
                return true;
            }

        } else {
            // 入力ミス
            mistakeSound.play();
            buffer = ''; // バッファをクリア
            keybordbuffTextElement.textContent = buffer;
        }
    }

    /**
     * ターゲット文章のハイライト処理を次の文字に変更する
     *
     */
    function updateComparisonText() {
        const textBefore = comparisonTextElement.textContent.slice(0, currentPosition.index);
        const textCurrent = comparisonTextElement.textContent.charAt(currentPosition.index);
        const textAfter = comparisonTextElement.textContent.slice(currentPosition.index + 1);
        comparisonTextElement.innerHTML = `${textBefore}<span class="highlight">${textCurrent}</span>${textAfter}`;
    }

    function isHiragana(char) {
        if (Array.isArray(char)) {
            return char.every(c => {
                const code = c.charCodeAt(0);
                return (code >= 0x3040 && code <= 0x309F);
            });ï
        } else {
            return char.split('').every(c => {
                const code = c.charCodeAt(0);
                return (code >= 0x3040 && code <= 0x309F);
            });
        }
    }

    /**
     *  ローマ字をひらがなに変換する
     *
     * @param {String} input：ローマ字
     * @return {String} ：該当するひらがな、なければ入力のアルファベットがそのまま戻る
     */
    function convertToHiragana(input) {
        // ローマ字をひらがなに変換する簡易関数

        // 「っ」に相当する促音の検出と変換
        if (input[0] === input[1] && input.length > 2) {
            // let result = (romajiHiragana[input.slice(1)] || input.slice(1))
            let result = romajiHiragana[input.slice(1)]
            if(!result){
                buffer = ''; // バッファをクリア
                keybordbuffTextElement.textContent = buffer;
                return result
            }
            result.unshift('っ')
            return result
        }
        return romajiHiragana[input] || [input];
    }

    /**
     * ひらがなをローマ字に変換する
     * 促音「っ」を含む場合は、次の文字と合わせて変換する
     *
     * @param {String} input：ひらがな
     * @return {String} ：該当するローマ字、なければ入力のひらがながそのまま戻る
     */
    function convertToRomaji(input) {
        // ひらがなをローマ字に変換する簡易関数
        // 促音「っ」が含まれる場合の処理
        if (input.length === 2 && input[0] === 'っ') {
            const nextCharRomaji = hiraganaRomaji[input[1]] || input[1]; // 次の文字のローマ字を取得
            // 1文字目（子音部分）を繰り返す（例: "っと" → "tto"）
            return nextCharRomaji.map(str => {
                const firstChar = str.charAt(0); // 最初の文字を取得
                return firstChar + str;          // 最初の文字を2回繰り返す
            });
        }

        return hiraganaRomaji[input] || [input];
    }
    // 初期表示の更新
    updateComparisonText();
});

// JSONファイルを読み込んでデータを取得する関数
async function loadJson(fileName) {
    try {
        const response = await fetch(fileName);  // JSONファイルを読み込む
        const json = await response.json();          // JSONデータを取得し、オブジェクトに変換
        return json;                                 // 読み込んだデータを返す
    } catch (error) {
        console.error('JSONの読み込みに失敗しました:', error);  // エラーハンドリング
    }
}

function toHalfWidth(str) {
    return str.replace(/[!-～]/g, function (char) {
        return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    }).replace(/ /g, ' ');
}

function convertToHalfWidth(str) {
    switch (str) {
        case "ー":
            return "-"
        case "「":
            return "["
        case "」":
            return "]"
    }
}