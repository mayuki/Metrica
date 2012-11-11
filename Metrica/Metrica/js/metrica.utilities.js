(function () {
    "use strict";

    /* ---------- Namespace: Metrica.Utilities ---------- */
    WinJS.Namespace.define("Metrica.Utilities", {
        /// <field name="supportedEncodings" type="Array">サポートしているエンコーディング</field>
        supportedEncodings: {
            get: function () { return ['UTF-8', 'ISO-2022-JP', 'US-ASCII']; }
        },

        removeFormatCodes: function (text) {
            /// <summary>色指定やフォーマット指定を削除します。</summary>
            /// <param name="text" type="String">色指定やフォーマット指定の含まれているテキスト。</param>
            /// <returns type="String" />
            return text.replace(/(\u0003\d+(,\d+)?|\u0002|\u000F|\u0016|\u001F)/g, '');
        },

        forEachWinRTObject: function (enumerableObject, predicate) {
            /// <summary>WinRT オブジェクトのIEnumerableなどを手繰ります。</summary>
            /// <param name="enumerableObject" type="IEnumerable">IEnumerableを実装するオブジェクト。</param>
            /// <param name="predicate" type="Function">アイテムごとに行う処理。</param>
            var iter = enumerableObject.first();
            var i = 0;
            while (iter.hasCurrent) {
                predicate(iter.current, i++);
                iter.moveNext();
            }
        },

        classify: function (name) {
            /// <summary>クラス名の形に変換する。(hoge -> Hoge, HAUHAU -> Hauhau)</summary>
            /// <param name="name" type="String">変換する名前</param>

            if (name == null) return null;

            var s = "";
            var parts = name.split('_');
            while (parts.length > 0) {
                var part = parts.shift();
                s += part.charAt(0).toUpperCase() + part.substr(1).toLowerCase();
            }
            return s;
        },
        linkify: function (text, disableImageExpansion) {
            /// <summary>テキストのリンクをa要素とimg要素に変換してDocumentFragmentとして返します。</summary>
            /// <param name="text" type="String">テキスト</param>
            /// <param name="disableImageExpansion" type="Boolean">画像展開を行わないかどうか</param>
            /// <returns type="DocumentFragment" />

            var fragment = document.createDocumentFragment();
            var linkRegex = /(https?:\/\/[a-zA-Z0-9-.:]+(?:\/[^ ()'""]+)?)/g;
            var m, start = 0;
            while (m = linkRegex.exec(text)) {
                fragment.appendChild(document.createTextNode(text.substr(start, linkRegex.lastIndex - m[0].length - start)));

                // 画像置き換え
                var imgElement = document.createElement('img');
                if (!disableImageExpansion) {
                    imgElement.alt = m[0];
                    imgElement.className = "embedded-thumbnail";
                    if (/http:\/\/twitpic.com\/[a-zA-Z0-9_-]+(\?.*)?/.test(m[0])) {
                        imgElement.src = m[0].replace("http://twitpic.com/", "http://twitpic.com/show/mini/");
                    } else if (/http:\/\/movapic.com\/pic\/[a-zA-Z0-9_-]+/.test(m[0])) {
                        imgElement.src = m[0].replace(/http:\/\/movapic.com\/pic\/([a-zA-Z0-9_-]+)/, "http://image.movapic.com/pic/s_$1.jpeg");
                    } else if (/http:\/\/yfrog.com\/pic\/[a-zA-Z0-9_-]+/.test(m[0])) {
                        imgElement.src = m[0].replace(/http:\/\/yfrog.com\/([a-zA-Z0-9_-]+)/, "http://yfrog.com/s_$1.th.jpg");
                    } else if (/http:\/\/instagr.am\/p\/([a-zA-Z0-9_-]+).*/.test(m[0])) {
                        imgElement.src = m[0].replace(/http:\/\/instagr.am\/p\/([a-zA-Z0-9_-]+).*/, "http://instagr.am/p/$1/media/?size=m");
                    } else if (/http:\/\/gyazo.com\/([a-zA-Z0-9_-]+).*/.test(m[0])) {
                        imgElement.src = m[0].replace(/http:\/\/gyazo.com\/([a-zA-Z0-9_-]+).*/, "http://cache.gyazo.com/$1.png");
                    }
                }

                // a要素を作る
                var aElement = document.createElement('a');
                aElement.href = m[0];
                if (imgElement.src) {
                    aElement.appendChild(imgElement);
                } else {
                    aElement.textContent = m[0];
                }
                fragment.appendChild(aElement);
                start = linkRegex.lastIndex;
            }
            fragment.appendChild(document.createTextNode(text.substr(start)));
            return fragment;
        },
        linkifyHtml: function (text, disableImageExpansion) {
            /// <summary>テキストのリンクをa要素とimg要素に変換してStringとして返します。</summary>
            /// <param name="text" type="String">テキスト</param>
            /// <param name="disableImageExpansion" type="Boolean">画像展開を行わないかどうか</param>
            /// <returns type="String" />

            var escapeHtml = Metrica.Utilities.escapeHtml;
            var fragment = '';
            var linkRegex = /(https?:\/\/[a-zA-Z0-9-.:]+(?:\/[^ ()'""]+)?)/g;
            var m, start = 0;
            while (m = linkRegex.exec(text)) {
                fragment += escapeHtml(text.substr(start, linkRegex.lastIndex - m[0].length - start));

                // 画像置き換え
                var imgElement;
                if (!disableImageExpansion && /^http:\/\/(?:twitpic|movapic|yfrog|instagr)/.test(m[0])) {
                    imgElement = '<img class="embedded-thumbnail"';
                    imgElement += ' alt="' + escapeHtml(m[0]) + '" src="';
                    if (/http:\/\/twitpic.com\/[a-zA-Z0-9_-]+(\?.*)?/.test(m[0])) {
                        imgElement += escapeHtml(m[0].replace("http://twitpic.com/", "http://twitpic.com/show/mini/"));
                    } else if (/http:\/\/movapic.com\/pic\/[a-zA-Z0-9_-]+/.test(m[0])) {
                        imgElement += escapeHtml(m[0].replace(/http:\/\/movapic.com\/pic\/([a-zA-Z0-9_-]+)/, "http://image.movapic.com/pic/s_$1.jpeg"));
                    } else if (/http:\/\/yfrog.com\/pic\/[a-zA-Z0-9_-]+/.test(m[0])) {
                        imgElement += escapeHtml(m[0].replace(/http:\/\/yfrog.com\/([a-zA-Z0-9_-]+)/, "http://yfrog.com/s_$1.th.jpg"));
                    } else if (/http:\/\/instagr.am\/p\/([a-zA-Z0-9_-]+).*/.test(m[0])) {
                        imgElement += escapeHtml(m[0].replace(/http:\/\/instagr.am\/p\/([a-zA-Z0-9_-]+).*/, "http://instagr.am/p/$1/media/?size=m"));
                    } else if (/http:\/\/gyazo.com\/([a-zA-Z0-9_-]+).*/.test(m[0])) {
                        imgElement += escapeHtml(m[0].replace(/http:\/\/gyazo.com\/([a-zA-Z0-9_-]+).*/, "http://cache.gyazo.com/$1.png"));
                    }
                    imgElement += '" />';
                }

                // a要素を作る
                var aElement = '<a href="' + escapeHtml(m[0]) + '">';
                if (imgElement) {
                    aElement += imgElement;
                } else {
                    aElement += escapeHtml(m[0]);
                }
                aElement += '</a>';
                fragment += aElement;
                start = linkRegex.lastIndex;
            }
            fragment += escapeHtml(text.substr(start));
            return fragment;
        },
        escapeHtml: function (text) {
            /// <summary>HTMLをエスケープします。</summary>
            /// <param name="text" type="String">テキスト</param>
            /// <returns type="String" />
            return text.replace(/[<>"&']/g, function ($0) { return ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[$0]; });
        }
    });

    var Metrica_Utilities_KeyCombination = WinJS.Class.define(function (key, modifiers, action) {
        /// <summary>キーのコンビネーションを表現するクラスです。</summary>
        /// <param name="key" type="String">キーの名前(Enter, Up, Down...)</param>
        /// <param name="modifiers" type="Object">モディファイアキー(Shift, Alt, Ctrl)</param>
        /// <param name="action" type="Function">キーが押されたときに実行されるアクション</param>
        modifiers = modifiers || {};

        this.key = key.toUpperCase();
        this.modifiers = {
            alt: modifiers.alt || false,
            ctrl: modifiers.ctrl || false,
            shift: modifiers.shift || false
        };
        this.action = action;
    }, {
        toString: function () {
            return (this.modifiers.shift ? "Shift+" : "") +
                   (this.modifiers.alt ? "Alt+" : "") +
                   (this.modifiers.ctrl ? "Ctrl+" : "") +
                   this.key;
        }
    });


    var Metrica_Utilities_KeyCombinationManager = WinJS.Class.define(function (targetElement) {
        /// <summary>キーのコンビネーションを扱うクラスです。</summary>
        this.keyCombinations = [];
        this.targetElement = targetElement;
        this.targetElement.addEventListener('keydown', this._onKeyDown.bind(this));
    }, {
        registerCombination: function (keyCombination) {
            /// <summary>
            /// キーのコンビネーションを登録します。
            /// </summary>
            if (keyCombination instanceof Array) {
                var that = this;
                keyCombination.forEach(function (keyCombination) {
                    that.keyCombinations.push(keyCombination);
                });
            } else {
                this.keyCombinations.push(keyCombination);
            }
        },
        dispose: function () {
            /// <summary>
            /// キー入力の監視を解除します。
            /// </summary>
            this.targetElement.removeEventListener('keydown', this._onKeyDown.bind(this));
        },
        _onKeyDown: function (e) {
            this.keyCombinations.forEach(function (keyCombination) {
                if (
                    e.key.toUpperCase() == keyCombination.key.toUpperCase() &&
                    e.altKey == keyCombination.modifiers.alt &&
                    e.shiftKey == keyCombination.modifiers.shift &&
                    e.ctrlKey == keyCombination.modifiers.ctrl
                ) {
                    //console.log("Key: %s", keyCombination);
                    if (keyCombination.action) {
                        if (keyCombination.action(e)){
                            e.preventDefault();
                        }
                    }
                }
            });
        }
    });


})();