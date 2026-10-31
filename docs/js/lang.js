//#import_compat _lang_mods

class SpeechLang
{
    constructor(tag, use_dic, use_phonemic) {
        this.tag = tag;
        this.use_dic = use_dic;
        this.use_phonemic = use_phonemic;
        this.to_phonemic = null;
        this.ToSound = null;
        this.params = null;
        this.variants = null;
    }

    is_loaded() {
        return this.ToSound !== null;
    }

    async load() {
//#replace         const mod = await $import(`./lang/${this.tag}.js`);
        const mod = await import(`../lang/${this.tag}.js`);
        this.to_phonemic = new mod.ToPhonemic();
        this.ToSound = mod.ToSound;
        this.params = mod.params;
        this.variants = mod.variants;
    }
}

export const speech_langs = {
//    'en': new SpeechLang('en', true, true),
    'ja': new SpeechLang('ja', true, true),
//    'zh': new SpeechLang('zh', true, true),
};

export const resources = {
    'en': {
        'UI': 'en-US',
        'speech-lang': 'ja',

        'tts': 'Text to Speech',
        'voices': 'Voices',
        'config': 'Settings',
        'help': 'Help',
        'new-proj': 'New Project',
        'open-proj': 'Open Project',
        'save-proj': 'Save Project',
        'save-as': 'Save Project as',
        'manage-proj': 'File Manager',
        'import-file': 'Import File',
        'export-file': 'Export File',
        'load-dic': 'Load the Default Dictionary',
        'ok':'OK',
        'open':'Open',
        'save':'Save',
        'cancel':'Cancel',
        'close':'Close',
        'execute': 'Execute',
        'update': 'Update',

        'upload-area1': 'Drop the file here',
        'upload-area2': 'Click here to choose the file',
        'click-enter-text': 'Click to enter text...',

        'tts-speed': 'Speed',
        'tts-pitch': 'Pitch',
        'tts-accent': 'Accent',
        'tts-volume': 'Volume',
        'voice-sample-ja': 'Listen (Japanese)',
        'warning-laud': 'Intensity noise may occur under certain parameters.',
        'wav-filename': 'WAV Filename',
        'filename-single': 'Single',
        'filename-seq': 'Series',
        'dictionary': 'Dictionary',
        'initialize-db': 'Initialize IndexedDB',
        'delete-all': 'Warning: Pressing this button will delete all stored data.',
        'confirm-delete-all': 'Are you sure to delete all stored data?',
        'delete-complete': 'All stored data has been deleted. Please close this page.',
        'confirm-delete-voice': 'Are you sure to delete “{0}”?',

        'en': 'English',
        'ja': 'Japanese',
        'zh': 'Chinese',

        'ninbos-voice-intro': 'NinbosVoice is a speech synthesizer works on a web browser.',
        'supported-browsers': 'Supported Browsers',
        'terms-of-use': 'Terms of Use',
        'tou-no-warranty': 'We assume no liability whatsoever for any damages arising from the use of this software or the inability to use it.',
        'tou-audio-use': 'The generated audio may be used for both commercial and non-commercial purposes. Please use it at your own risk.',
        'tou-beta-release': 'This software is a beta version. Please be aware that data created previously may become unavailable.',
        'software-license': 'Software License',
        'language-support-info': 'English speech synthesis is not yet available.',
        'software-descript1': 'NinbosVoice is released under the GPL version 3 license.',
        'software-descript2': 'This product uses modified portions of the eSpeak NG source code and audio data.',
    },
    'ja': {
        'UI': 'ja-JP',
        'speech-lang': 'ja',

        'tts': '読み上げ',
        'voices': 'キャラクター',
        'config': '設定',
        'help': 'ヘルプ',
        'new-proj': '新規プロジェクト',
        'open-proj': 'プロジェクトを開く',
        'save-proj': 'プロジェクトを保存',
        'save-as': 'プロジェクトを別名で保存',
        'manage-proj': 'ファイルマネージャー',
        'import-file': 'ファイルから取り込み',
        'export-file': 'ファイルに保存',
        'load-dic': 'デフォルト辞書を読み込む',
        'open':'開く',
        'save':'保存',
        'cancel':'キャンセル',
        'close':'閉じる',
        'execute': '実行',
        'update': '更新',

        'upload-area1': 'ファイルをここにドロップ',
        'upload-area2': 'ここをクリックしてファイルを選択',
        'click-enter-text': 'クリックしてテキストを入力...',

        'tts-speed': '話速',
        'tts-pitch': 'ピッチ',
        'tts-accent': '抑揚',
        'tts-volume': '音量',
        'voice-sample-ja': '試聴',
        'warning-laud': 'パラメーターによっては激しいノイズが発生する場合があります。',
        'wav-filename': 'WAV ファイル名',
        'filename-single': '単独',
        'filename-seq': '連番',
        'dictionary': '辞書',
        'initialize-db': 'IndexedDB の初期化',
        'delete-all': '警告: ボタンを押すと保存されているすべてのデータを削除します。',
        'confirm-delete-all': '保存されているすべてのデータを削除してもよろしいですか？',
        'delete-complete': '保存されているすべてのデータは削除されました。このままページを閉じてください。',
        'confirm-delete-voice': '「{0}」を削除しますか？',

        'en': '英語',
        'ja': '日本語',
        'zh': '中国語',

        'ninbos-voice-intro': 'NinbosVoice は、ブラウザで動作する音声合成ソフトウェアです。',
        'supported-browsers': '対応ブラウザ',
        'terms-of-use': '利用規約',
        'tou-no-warranty': '本ソフトウェアの使用、もしくは使用不能によって生じた損害の責任は一切負いません。',
        'tou-audio-use': '作成した音声は商用・非商用問わず利用できます。ご自身の責任でご使用ください。',
        'tou-beta-release': '本ソフトウェアはベータ版です。作成したデータが使用できなくなる可能性があることをご了承ください。',
        'software-license': 'ソフトウェアライセンス',
        'language-support-info': '',
        'software-descript1': 'NinbosVoice は GPL version 3 ライセンスが適用されます。',
        'software-descript2': '本ソフトウェアは eSpeak NG のソースコード・音声データの一部を改変して利用しています。',
    },
    'zh': {
        'UI': 'zh',
        'speech-lang': 'ja',

        'tts': '文字转语音',
        'voices': '声音个性',
        'config': '设置',
        'help': '帮助',
        'new-proj': '新建工程',
        'open-proj': '打开工程',
        'save-proj': '储存工程',
        'save-as': '将工程另存为',
        'manage-proj': '文件管理器',
        'import-file': '从文件导入',
        'export-file': '导出到文件',
        'load-dic': '加载默认词典',
        'ok':'确定',
        'cancel':'取消',
        'close':'关闭',
        'open':'打开',
        'save':'储存',
        'execute': '执行',
        'update': '更新',

        'upload-area1': '在此处拖放文件',
        'upload-area2': '单击此处以选择文件',
        'click-enter-text': '点击以输入文字...',

        'tts-speed': '语速',
        'tts-pitch': '音高',
        'tts-accent': '重音',
        'tts-volume': '音量',
        'voice-sample-ja': '预听 (日语)',
        'warning-laud': '在特定参数下，可能会出现强度噪声。',
        'wav-filename': 'WAV 文件名',
        'filename-single': '单个',
        'filename-seq': '连载',
        'dictionary': '词典',
        'initialize-db': '初始化 IndexedDB',
        'delete-all': '警告: 按下此按钮将删除所有已存储的数据。',
        'confirm-delete-all': '您确定要删除所有已存储的数据吗？',
        'delete-complete': '所有已存储的数据均已删除。请关闭此页面。',
        'confirm-delete-voice': '确定要删除“{0}”吗？',

        'en': '英语',
        'ja': '日语',
        'zh': '汉语',

        'ninbos-voice-intro': 'NinbosVoice 是在网页浏览器上运行的语音合成器。',
        'supported-browsers': '浏览器支持',
        'terms-of-use': '使用条款',
        'software-license': '软件许可',
        'language-support-info': '中文语音合成功能尚无法使用。',
        'software-descript1': 'NinbosVoice 基于 GPL 第 3 版本许可证发布。',
        'software-descript2': '本软件使用了 eSpeak NG 源代码和音频数据中部分内容的修改版本。',
    },
    'zh-hant': {
        'UI': 'zh-Hant',
        'speech-lang': 'ja',

        'tts': '文字轉語音',
        'voices': '聲音個性',
        'config': '設置',
        'help': '幫助',
        'new-proj': '新建工程',
        'open-proj': '打開工程',
        'save-proj': '儲存工程',
        'save-as': '將工程另存為',
        'manage-proj': '文件管理器',
        'import-file': '從文件導入',
        'export-file': '匯出到文件',
        'load-dic': '載入預設詞典',
        'ok':'確定',
        'cancel':'取消',
        'close':'關閉',
        'open':'打開',
        'save':'儲存',
        'execute': '執行',
        'update': '更新',

        'upload-area1': '在此處拖放文件',
        'upload-area2': '單擊這裡以選擇文件',
        'click-enter-text': '單擊以輸入文字...',

        'tts-speed': '語速',
        'tts-pitch': '音高',
        'tts-accent': '重音',
        'tts-volume': '音量',
        'voice-sample-ja': '預聽 (日語)',
        'warning-laud': '在特定參數下，可能會出現強度噪音。',
        'wav-filename': 'WAV 檔案名稱',
        'filename-single': '單個',
        'filename-seq': '序號',
        'dictionary': '詞典',
        'initialize-db': '初始化 IndexedDB',
        'delete-all': '警告: 按下此按鈕將刪除所有已儲存的資料。',
        'confirm-delete-all': '您確定要刪除所有已儲存的資料嗎？',
        'delete-complete': '所有已儲存的資料均已刪除。請關閉此頁面。',
        'confirm-delete-voice': '確定要刪除「{0}」嗎？',

        'en': '英語',
        'ja': '日語',
        'zh': '漢語',

        'supported-browsers': '瀏覽器支持',
        'terms-of-use': '使用條款',
        'ninbos-voice-intro': 'NinbosVoice 是在網頁瀏覽器上運行的語音合成器。',
        'software-license': '軟件授權條款',
        'language-support-info': '中文語音合成功能尚無法使用。',
        'software-descript1': 'NinbosVoice 根據 GPL 版本 3 的授權協議發布。',
        'software-descript2': '本軟件使用了 eSpeak NG 原始碼和音訊資料的修改版本。',
    },
};
