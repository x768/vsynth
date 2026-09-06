# About NinbosVoice

NinbosVoiceは、JavaScriptで実装した音声合成ソフトウェアです。

NinbosVoice is a speech synthesizer works on a web browser.
Speech synthesis feature for English is not yet available.

# Features

- 肉声不使用のロボットボイス
- 100%ルールベースなので棒読み
- 非ユーザーフレンドリー、記法覚えてね

# Using from node.js

音声合成に関する処理は、`docs/lib/` にすべて入っています。
各jsは単独で動作するので、ファイルを置いてimportすれば使えます。

使用例は、`sample.js`をご覧ください。

# Use offline

本ソフトウェアは、初回起動時の辞書読み込み以外は外部と通信していないため、オフラインで使用することもできます。

## ローカルでhttpサーバーを立てる

`docs/` をルートにしてhttpサーバーを立てることで、ローカルで動かすことができます。

## ESModule未使用版を直接開く

`make.py` を実行すると、ESModuleを使わないファイルが `local/` に生成されるので、直接実行できます。
初回起動時の辞書読み込みは、事前にダウンロードした `dict_ja.txt` を手動で読み込んでください。

[!WARNING]

本ソフトウェアはベータ版です。
作成したデータが使用できなくなる可能性があることをご了承ください。

# Acknowledgments

本ソフトウェアは、 eSpeak NG のソースコード・音声データの一部を改変して利用しています。

This product uses modified portions of the eSpeak NG source code and audio data.

https://github.com/espeak-ng/espeak-ng/
