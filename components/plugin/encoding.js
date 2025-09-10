import encodingIndexes from './encoding-indexes.js';

  /**
   * @param {number} a The number to test.
   * @param {number} min The minimum value in the range, inclusive.
   * @param {number} max The maximum value in the range, inclusive.
   * @return {boolean} True if a >= min and a <= max.
   */
  function inRange(a, min, max) {
    return min <= a && a <= max;
  }

  /**
   * @param {!Array.<*>} array The array to check.
   * @param {*} item The item to look for in the array.
   * @return {boolean} True if the item appears in the array.
   */
  function includes(array, item) {
    return array.indexOf(item) !== -1;
  }

  const floor = Math.floor;

  /**
   * @param {*} o
   * @return {Object}
   */
  function ToDictionary(o) {
    if (o === undefined) return {};
    if (o === Object(o)) return o;
    throw new TypeError('Could not convert argument to dictionary');
  }

  /**
   * @param {string} string Input string of UTF-16 code units.
   * @return {!Array.<number>} Code points.
   */
  function stringToCodePoints(string) {
    // https://heycam.github.io/webidl/#dfn-obtain-unicode

    // 1. Let S be the DOMString value.
    const s = String(string);

    // 2. Let n be the length of S.
    let n = s.length;

    // 3. Initialize i to 0.
    let i = 0;

    // 4. Initialize U to be an empty sequence of Unicode characters.
    let u = [];

    // 5. While i < n:
    while (i < n) {

      // 1. Let c be the code unit in S at index i.
      let c = s.charCodeAt(i);

      // 2. Depending on the value of c:

      // c < 0xD800 or c > 0xDFFF
      if (c < 0xD800 || c > 0xDFFF) {
        // Append to U the Unicode character with code point c.
        u.push(c);
      }

      // 0xDC00 ≤ c ≤ 0xDFFF
      else if (0xDC00 <= c && c <= 0xDFFF) {
        // Append to U a U+FFFD REPLACEMENT CHARACTER.
        u.push(0xFFFD);
      }

      // 0xD800 ≤ c ≤ 0xDBFF
      else if (0xD800 <= c && c <= 0xDBFF) {
        // 1. If i = n−1, then append to U a U+FFFD REPLACEMENT
        // CHARACTER.
        if (i === n - 1) {
          u.push(0xFFFD);
        }
        // 2. Otherwise, i < n−1:
        else {
          // 1. Let d be the code unit in S at index i+1.
          let d = s.charCodeAt(i + 1);

          // 2. If 0xDC00 ≤ d ≤ 0xDFFF, then:
          if (0xDC00 <= d && d <= 0xDFFF) {
            // 1. Let a be c & 0x3FF.
            let a = c & 0x3FF;

            // 2. Let b be d & 0x3FF.
            let b = d & 0x3FF;

            // 3. Append to U the Unicode character with code point
            // 2^16+2^10*a+b.
            u.push(0x10000 + (a << 10) + b);

            // 4. Set i to i+1.
            i += 1;
          }

          // 3. Otherwise, d < 0xDC00 or d > 0xDFFF. Append to U a
          // U+FFFD REPLACEMENT CHARACTER.
          else  {
            u.push(0xFFFD);
          }
        }
      }

      // 3. Set i to i+1.
      i += 1;
    }

    // 6. Return U.
    return u;
  }

  /**
   * @param {!Array.<number>} codePoints Array of code points.
   * @return {string} string String of UTF-16 code units.
   */
  function codePointsToString(codePoints) {
    let s = '';
    for (let i = 0; i < codePoints.length; ++i) {
      let cp = codePoints[i];
      if (cp <= 0xFFFF) {
        s += String.fromCodePoint(cp);
      } else {
        cp -= 0x10000;
        s += String.fromCodePoint(
		  ((cp >> 10) + 0xD800),
          ((cp & 0x3FF) + 0xDC00)
		);
      }
    }
    return s;
  }


  //
  // Implementation of Encoding specification
  // https://encoding.spec.whatwg.org/
  //

  //
  // 4. Terminology
  //

  /**
   * An ASCII byte is a byte in the range 0x00 to 0x7F, inclusive.
   * @param {number} a The number to test.
   * @return {boolean} True if a is in the range 0x00 to 0x7F, inclusive.
   */
  function isASCIIByte(a) {
    return 0x00 <= a && a <= 0x7F;
  }

  /**
   * An ASCII code point is a code point in the range U+0000 to
   * U+007F, inclusive.
   */
  const isASCIICodePoint = isASCIIByte;


  /**
   * End-of-stream is a special token that signifies no more tokens
   * are in the stream.
   * @const
   */ 
  const end_of_stream = -1;

  /**
   * A stream represents an ordered sequence of tokens.
   *
   * @constructor
   * @param {!(Array.<number>|Uint8Array)} tokens Array of tokens that provide
   * the stream.
   */
  
  
  class Stream {
    constructor(tokens) {
      /** @type {!Array.<number>} */
      // this.tokens = Array.from(tokens).reverse();
      this.tokens = [...tokens].reverse();
    }

    /**
      * @return {boolean} True if end-of-stream has been hit.
      */
     endOfStream() {
       return this.tokens.length === 0;
     }
   
     /**
      * When a token is read from a stream, the first token in the
      * stream must be returned and subsequently removed, and
      * end-of-stream must be returned otherwise.
      *
      * @return {number} Get the next token from the stream, or
      * end_of_stream.
      */
     read() {
       if (!this.tokens.length) {
         return end_of_stream; // Assuming end_of_stream is defined somewhere
       }
       return this.tokens.pop();
     }
   
     /**
      * When one or more tokens are prepended to a stream, those tokens
      * must be inserted, in given order, before the first token in the
      * stream.
      *
      * @param {(number|!Array.<number>)} token The token(s) to prepend to the
      * stream.
      */
     prepend(token) {
       if (Array.isArray(token)) {
         token.reverse().forEach(t => this.tokens.push(t));
       } else {
         this.tokens.push(token);
       }
     }
   
     /**
      * When one or more tokens are pushed to a stream, those tokens
      * must be inserted, in given order, after the last token in the
      * stream.
      *
      * @param {(number|!Array.<number>)} token The tokens(s) to push to the
      * stream.
      */
     push(token) {
       if (Array.isArray(token)) {
         token.forEach(t => this.tokens.unshift(t));
       } else {
         this.tokens.unshift(token);
       }
     }
}

  //
  // 5. Encodings
  //

  // 5.1 Encoders and decoders

  /** @const */
  const finished = -1;

  /**
   * @param {boolean} fatal If true, decoding errors raise an exception.
   * @param {number=} opt_code_point Override the standard fallback code point.
   * @return {number} The code point to insert on a decoding error.
   */
  function decoderError(fatal, opt_code_point) {
    if (fatal)
      throw new TypeError('Decoder error');
    return opt_code_point || 0xFFFD;
  }

  /**
   * @param {number} code_point The code point that could not be encoded.
   * @return {number} Always throws, no value is actually returned.
   */
  function encoderError(code_point) {
    throw new TypeError('The code point ' + code_point + ' could not be encoded.');
  }

  /**
   * @interface
   */
  class Decoder {
    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point, or |finished|.
     */
    handler(stream, bite) {}
  }
  
  /**
   * @interface
   */
  class Encoder {
    /**
     * @param {Stream} stream The stream of code points being encoded.
     * @param {number} codePoint Next code point read from the stream.
     * @return {(number|!Array.<number>)} Byte(s) to emit, or |finished|.
     */
    handler(stream, codePoint) {}
  }
  
  // Assuming `label_to_encoding` is defined somewhere in your code.
  // 5.2 Names and labels
  
  // TODO: Define @typedef for Encoding: {name:string,labels:Array.<string>}
  // https://github.com/google/closure-compiler/issues/247
  
  /**
   * @param {string} label The encoding label.
   * @return {?{name:string,labels:Array.<string>}}
   */
  function getEncoding(label) {
    // 1. Remove any leading and trailing ASCII whitespace from label.
    label = String(label).trim().toLowerCase();
  
    // 2. If label is an ASCII case-insensitive match for any of the
    // labels listed in the table below, return the corresponding
    // encoding, and failure otherwise.
    if (Object.prototype.hasOwnProperty.call(label_to_encoding, label)) {
      return label_to_encoding[label];
    }
    return null;
  }

  /**
   * Encodings table: https://encoding.spec.whatwg.org/encodings.json
   * @const
   * @type {!Array.<{
   *          heading: string,
   *          encodings: Array.<{name:string,labels:Array.<string>}>
   *        }>}
   */
  const encodings = [
    {
      "encodings": [
        {
          "labels": [
            "unicode-1-1-utf-8",
            "utf-8",
            "utf8"
          ],
          "name": "UTF-8"
        }
      ],
      "heading": "The Encoding"
    },
    {
      "encodings": [
        {
          "labels": [
            "866",
            "cp866",
            "csibm866",
            "ibm866"
          ],
          "name": "IBM866"
        },
        {
          "labels": [
            "csisolatin2",
            "iso-8859-2",
            "iso-ir-101",
            "iso8859-2",
            "iso88592",
            "iso_8859-2",
            "iso_8859-2:1987",
            "l2",
            "latin2"
          ],
          "name": "ISO-8859-2"
        },
        {
          "labels": [
            "csisolatin3",
            "iso-8859-3",
            "iso-ir-109",
            "iso8859-3",
            "iso88593",
            "iso_8859-3",
            "iso_8859-3:1988",
            "l3",
            "latin3"
          ],
          "name": "ISO-8859-3"
        },
        {
          "labels": [
            "csisolatin4",
            "iso-8859-4",
            "iso-ir-110",
            "iso8859-4",
            "iso88594",
            "iso_8859-4",
            "iso_8859-4:1988",
            "l4",
            "latin4"
          ],
          "name": "ISO-8859-4"
        },
        {
          "labels": [
            "csisolatincyrillic",
            "cyrillic",
            "iso-8859-5",
            "iso-ir-144",
            "iso8859-5",
            "iso88595",
            "iso_8859-5",
            "iso_8859-5:1988"
          ],
          "name": "ISO-8859-5"
        },
        {
          "labels": [
            "arabic",
            "asmo-708",
            "csiso88596e",
            "csiso88596i",
            "csisolatinarabic",
            "ecma-114",
            "iso-8859-6",
            "iso-8859-6-e",
            "iso-8859-6-i",
            "iso-ir-127",
            "iso8859-6",
            "iso88596",
            "iso_8859-6",
            "iso_8859-6:1987"
          ],
          "name": "ISO-8859-6"
        },
        {
          "labels": [
            "csisolatingreek",
            "ecma-118",
            "elot_928",
            "greek",
            "greek8",
            "iso-8859-7",
            "iso-ir-126",
            "iso8859-7",
            "iso88597",
            "iso_8859-7",
            "iso_8859-7:1987",
            "sun_eu_greek"
          ],
          "name": "ISO-8859-7"
        },
        {
          "labels": [
            "csiso88598e",
            "csisolatinhebrew",
            "hebrew",
            "iso-8859-8",
            "iso-8859-8-e",
            "iso-ir-138",
            "iso8859-8",
            "iso88598",
            "iso_8859-8",
            "iso_8859-8:1988",
            "visual"
          ],
          "name": "ISO-8859-8"
        },
        // {
        //   "labels": [
        //     "csiso88598i",
        //     "iso-8859-8-i",
        //     "logical"
        //   ],
        //   "name": "ISO-8859-8-i"
        // },
        {
          "labels": [
            "csisolatin6",
            "iso-8859-10",
            "iso-ir-157",
            "iso8859-10",
            "iso885910",
            "l6",
            "latin6"
          ],
          "name": "ISO-8859-10"
        },
        {
          "labels": [
            "iso-8859-13",
            "iso8859-13",
            "iso885913"
          ],
          "name": "ISO-8859-13"
        },
        {
          "labels": [
            "iso-8859-14",
            "iso8859-14",
            "iso885914"
          ],
          "name": "ISO-8859-14"
        },
        {
          "labels": [
            "csisolatin9",
            "iso-8859-15",
            "iso8859-15",
            "iso885915",
            "iso_8859-15",
            "l9"
          ],
          "name": "ISO-8859-15"
        },
        {
          "labels": [
            "iso-8859-16"
          ],
          "name": "ISO-8859-16"
        },
        {
          "labels": [
            "cskoi8r",
            "koi",
            "koi8",
            "koi8-r",
            "koi8_r"
          ],
          "name": "KOI8-R"
        },
        {
          "labels": [
            "koi8-ru",
            "koi8-u"
          ],
          "name": "KOI8-U"
        },
        {
          "labels": [
            "csmacintosh",
            "mac",
            "macintosh",
            "x-mac-roman"
          ],
          "name": "macintosh"
        },
        {
          "labels": [
            "dos-874",
            "iso-8859-11",
            "iso8859-11",
            "iso885911",
            "tis-620",
            "windows-874"
          ],
          "name": "windows-874"
        },
        {
          "labels": [
            "cp1250",
            "windows-1250",
            "x-cp1250"
          ],
          "name": "windows-1250"
        },
        {
          "labels": [
            "cp1251",
            "windows-1251",
            "x-cp1251"
          ],
          "name": "windows-1251"
        },
        {
          "labels": [
            "ansi_x3.4-1968",
            "ascii",
            "cp1252",
            "cp819",
            "csisolatin1",
            "ibm819",
            "iso-8859-1",
            "iso-ir-100",
            "iso8859-1",
            "iso88591",
            "iso_8859-1",
            "iso_8859-1:1987",
            "l1",
            "latin1",
            "us-ascii",
            "windows-1252",
            "x-cp1252"
          ],
          "name": "windows-1252"
        },
        {
          "labels": [
            "cp1253",
            "windows-1253",
            "x-cp1253"
          ],
          "name": "windows-1253"
        },
        {
          "labels": [
            "cp1254",
            "csisolatin5",
            "iso-8859-9",
            "iso-ir-148",
            "iso8859-9",
            "iso88599",
            "iso_8859-9",
            "iso_8859-9:1989",
            "l5",
            "latin5",
            "windows-1254",
            "x-cp1254"
          ],
          "name": "windows-1254"
        },
        {
          "labels": [
            "cp1255",
            "windows-1255",
            "x-cp1255"
          ],
          "name": "windows-1255"
        },
        {
          "labels": [
            "cp1256",
            "windows-1256",
            "x-cp1256"
          ],
          "name": "windows-1256"
        },
        {
          "labels": [
            "cp1257",
            "windows-1257",
            "x-cp1257"
          ],
          "name": "windows-1257"
        },
        {
          "labels": [
            "cp1258",
            "windows-1258",
            "x-cp1258"
          ],
          "name": "windows-1258"
        },
        {
          "labels": [
            "x-mac-cyrillic",
            "x-mac-ukrainian"
          ],
          "name": "x-mac-cyrillic"
        }
      ],
      "heading": "Legacy single-byte encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "chinese",
            "csgb2312",
            "csiso58gb231280",
            "gb2312",
            "gb_2312",
            "gb_2312-80",
            "gbk",
            "iso-ir-58",
            "x-gbk"
          ],
          "name": "GBK"
        },
        {
          "labels": [
            "gb18030"
          ],
          "name": "gb18030"
        }
      ],
      "heading": "Legacy multi-byte Chinese (simplified) encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "big5",
            "big5-hkscs",
            "cn-big5",
            "csbig5",
            "x-x-big5"
          ],
          "name": "Big5"
        }
      ],
      "heading": "Legacy multi-byte Chinese (traditional) encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "cseucpkdfmtjapanese",
            "euc-jp",
            "x-euc-jp"
          ],
          "name": "EUC-JP"
        },
        {
          "labels": [
            "csiso2022jp",
            "iso-2022-jp"
          ],
          "name": "ISO-2022-JP"
        },
        {
          "labels": [
            "csshiftjis",
            "ms932",
            "ms_kanji",
            "shift-jis",
            "shift_jis",
            "sjis",
            "windows-31j",
            "x-sjis"
          ],
          "name": "Shift_JIS"
        }
      ],
      "heading": "Legacy multi-byte Japanese encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "cseuckr",
            "csksc56011987",
            "euc-kr",
            "iso-ir-149",
            "korean",
            "ks_c_5601-1987",
            "ks_c_5601-1989",
            "ksc5601",
            "ksc_5601",
            "windows-949"
          ],
          "name": "EUC-KR"
        }
      ],
      "heading": "Legacy multi-byte Korean encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "csiso2022kr",
            "hz-gb-2312",
            "iso-2022-cn",
            "iso-2022-cn-ext",
            "iso-2022-kr"
          ],
          "name": "replacement"
        },
        {
          "labels": [
            "utf-16be"
          ],
          "name": "UTF-16BE"
        },
        {
          "labels": [
            "utf-16",
            "utf-16le"
          ],
          "name": "UTF-16LE"
        },
        {
          "labels": [
            "x-user-defined"
          ],
          "name": "x-user-defined"
        }
      ],
      "heading": "Legacy miscellaneous encodings"
    }
  ];

  // Label to encoding registry.
  /** @type {Object.<string,{name:string,labels:Array.<string>}>} */
  let label_to_encoding = {};
  encodings.forEach(function(category) {
    category.encodings.forEach(function(encoding) {
      encoding.labels.forEach(function(label) {
        label_to_encoding[label] = encoding;
      });
    });
  });

  // Registry of of encoder/decoder factories, by encoding name.
  /** @type {Object.<string, function({fatal:boolean}): Encoder>} */
  let encoders = {};
  /** @type {Object.<string, function({fatal:boolean}): Decoder>} */
  let decoders = {};

  //
  // 6. Indexes
  //

  /**
   * @param {number} pointer The |pointer| to search for.
   * @param {(!Array.<?number>|undefined)} index The |index| to search within.
   * @return {?number} The code point corresponding to |pointer| in |index|,
   *     or null if |code point| is not in |index|.
   */
  function indexCodePointFor(pointer, index) {
    if (!index) return null;
    return index[pointer] || null;
  }

  /**
   * @param {number} code_point The |code point| to search for.
   * @param {!Array.<?number>} index The |index| to search within.
   * @return {?number} The first pointer corresponding to |code point| in
   *     |index|, or null if |code point| is not in |index|.
   */
  function indexPointerFor(code_point, index) {
    let pointer = index.indexOf(code_point);
    return pointer === -1 ? null : pointer;
  }

  /**
   * @param {string} name Name of the index.
   * @return {(!Array.<number>|!Array.<Array.<number>>)}
   *  */
  function index(name) {
    if (!encodingIndexes.hasOwnProperty(name)) {
        throw new Error(`Index for "${name}" not found.`);
    }
    return encodingIndexes[name];
  }

  /**
   * @param {number} pointer The |pointer| to search for in the gb18030 index.
   * @return {?number} The code point corresponding to |pointer| in |index|,
   *     or null if |code point| is not in the gb18030 index.
   */
  function indexGB18030RangesCodePointFor(pointer) {
    // 1. If pointer is greater than 39419 and less than 189000, or
    // pointer is greater than 1237575, return null.
    if ((pointer > 39419 && pointer < 189000) || (pointer > 1237575))
      return null;

    // 2. If pointer is 7457, return code point U+E7C7.
    if (pointer === 7457) return 0xE7C7;

    // 3. Let offset be the last pointer in index gb18030 ranges that
    // is equal to or less than pointer and let code point offset be
    // its corresponding code point.
    let offset = 0;
    let code_point_offset = 0;
    let idx = index('gb18030-ranges');
    for (let i = 0; i < idx.length; ++i) {
      /** @type {!Array.<number>} */
      let entry = idx[i];
      if (entry[0] <= pointer) {
        offset = entry[0];
        code_point_offset = entry[1];
      } else {
        break;
      }
    }

    // 4. Return a code point whose value is code point offset +
    // pointer − offset.
    return code_point_offset + pointer - offset;
  }

  /**
   * @param {number} code_point The |code point| to locate in the gb18030 index.
   * @return {number} The first pointer corresponding to |code point| in the
   *     gb18030 index.
   */
  function indexGB18030RangesPointerFor(code_point) {
    // 1. If code point is U+E7C7, return pointer 7457.
    if (code_point === 0xE7C7) return 7457;

    // 2. Let offset be the last code point in index gb18030 ranges
    // that is equal to or less than code point and let pointer offset
    // be its corresponding pointer.
    let offset = 0;
    let pointer_offset = 0;
    let idx = index('gb18030-ranges');
    for (let i = 0; i < idx.length; ++i) {
      /** @type {!Array.<number>} */
      let entry = idx[i];
      if (entry[1] <= code_point) {
        offset = entry[1];
        pointer_offset = entry[0];
      } else {
        break;
      }
    }

    // 3. Return a pointer whose value is pointer offset + code point
    // − offset.
    return pointer_offset + code_point - offset;
  }

  /**
   * @param {number} code_point The |code_point| to search for in the Shift_JIS
   *     index.
   * @return {?number} The code point corresponding to |pointer| in |index|,
   *     or null if |code point| is not in the Shift_JIS index.
   */
  function indexShiftJISPointerFor(code_point) {
    // 1. Let index be index jis0208 excluding all entries whose
    // pointer is in the range 8272 to 8835, inclusive.
    shift_jis_index = shift_jis_index ||
      index('jis0208').map(function(code_point, pointer) {
        return inRange(pointer, 8272, 8835) ? null : code_point;
      });
     const index_ = shift_jis_index;

    // 2. Return the index pointer for code point in index.
    return index_.indexOf(code_point);
  }
  let shift_jis_index;

  /**
   * @param {number} code_point The |code_point| to search for in the big5
   *     index.
   * @return {?number} The code point corresponding to |pointer| in |index|,
   *     or null if |code point| is not in the big5 index.
   */
  function indexBig5PointerFor(code_point) {
    // 1. Let index be index Big5 excluding all entries whose pointer
    big5_index_no_hkscs = big5_index_no_hkscs ||
      index('big5').map(function(code_point, pointer) {
        return (pointer < (0xA1 - 0x81) * 157) ? null : code_point;
      });
    const index_ = big5_index_no_hkscs;

    // 2. If code point is U+2550, U+255E, U+2561, U+256A, U+5341, or
    // U+5345, return the last pointer corresponding to code point in
    // index.
    if (code_point === 0x2550 || code_point === 0x255E ||
        code_point === 0x2561 || code_point === 0x256A ||
        code_point === 0x5341 || code_point === 0x5345) {
      return index_.lastIndexOf(code_point);
    }

    // 3. Return the index pointer for code point in index.
    return indexPointerFor(code_point, index_);
  }
  let big5_index_no_hkscs;

  //
  // 8. API
  //

  /** @const */ 
  const DEFAULT_ENCODING = 'utf-8';

  // 8.1 Interface TextDecoder
  class TextDecoder {
    /**
     * @constructor
     * @param {string=} label The label of the encoding; defaults to 'utf-8'.
     * @param {Object=} options
     */
    constructor(label = DEFAULT_ENCODING, options = {}) {
      if (!(this instanceof TextDecoder))
        throw new TypeError('Called as a function. Did you forget \'new\'?');

      // 将 options 转换为字典
      options = ToDictionary(options);
	  
      this._encoding = null;
      this._decoder = null;
      this._ignoreBOM = false;
      this._BOMseen = false;
      this._error_mode = 'replacement';
      this._do_not_flush = false;
	  
      const encoding = getEncoding(label);
      if (!encoding || encoding.name === 'replacement')
        throw new RangeError(`Unknown encoding: ${label}`);
      if (!decoders[encoding.name])
        throw new Error('Decoder not present. Did you forget to include encoding-indexes.js first?');
  
      this._encoding = encoding;
      if (Boolean(options['fatal']))
        this._error_mode = 'fatal';
      if (Boolean(options['ignoreBOM']))
        this._ignoreBOM = true;
		
	   // this.encoding = this._encoding.name.toLowerCase();
       // this.fatal = this._error_mode === 'fatal';
       // this.ignoreBOM = this._ignoreBOM;
	}
	
    get encoding() {
      return this._encoding.name.toLowerCase();
    }
  
    get fatal() {
      return this._error_mode === 'fatal';
    }
  
    get ignoreBOM() {
      return this._ignoreBOM;
    }
  
    /**
     * @param {BufferSource=} input The buffer of bytes to decode.
     * @param {Object=} options
     * @return {string} The decoded string.
     */
    decode(input = new Uint8Array(0), options = {}) {
      let bytes;
      if (input instanceof ArrayBuffer) {
        bytes = new Uint8Array(input);
      } else if ('buffer' in input && input.buffer instanceof ArrayBuffer) {
        bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      } else {
        bytes = new Uint8Array(0);
      }

      options = ToDictionary(options);

      this._do_not_flush = Boolean(options.stream);
  
      if (!this._do_not_flush) {
        this._decoder = decoders[this._encoding.name]({ fatal: this._error_mode === 'fatal' });
        this._BOMseen = false;
      }
  
      const input_stream = new Stream(bytes);
      const output = [];
  
      let result;
      while (true) {
        const token = input_stream.read();
        if (token === end_of_stream) break;
  
        result = this._decoder.handler(input_stream, token);
        if (result === finished) break;
        if (result !== null) {
          if (Array.isArray(result)){
            output.push(...result);
          }else{
            output.push(result);
		  }
        }
      }
  
      if (!this._do_not_flush) {
        do {
          result = this._decoder.handler(input_stream, input_stream.read());
          if (result === finished) break;
          if (result !== null) {
            if (Array.isArray(result))
              output.push(...result);
            else
              output.push(result);
          }
        } while (!input_stream.endOfStream());
        this._decoder = null;
      }
  
    const serializeStream = (stream) => {
      if (includes(['UTF-8', 'UTF-16LE', 'UTF-16BE'], this._encoding.name) &&
          !this._ignoreBOM && !this._BOMseen) {
        if (stream[0] === 0xFEFF) {
          this._BOMseen = true;
          stream.shift();
        } else if (stream.length > 0) {
          this._BOMseen = true;
        }
      }
      return codePointsToString(stream);
    }
	
	  return serializeStream(output);
	}
	
} 
  // Usage of the TextDecoder class
  // const decoder = new TextDecoder('utf-8');
  // const decodedString = decoder.decode(someBuffer);


  // 8.2 Interface TextEncoder
  class TextEncoder {
    /**
     * @constructor
     * @param {string=} label The label of the encoding. NONSTANDARD.
     * @param {Object=} options NONSTANDARD.
     */
    constructor(label, options = {}) {
      if (!(this instanceof TextEncoder))
        throw new TypeError('Called as a function. Did you forget \'new\'?');
		
	  options = ToDictionary(options);
	  
      this._encoding = null;
      this._encoder = null;
      this._do_not_flush = false;
      this._fatal = options.fatal ? 'fatal' : 'replacement';
  
      const enc = this;
  
      if (options.NONSTANDARD_allowLegacyEncoding) {
        label = label !== undefined ? String(label) : DEFAULT_ENCODING;
        let encoding = getEncoding(label);
        if (encoding === null || encoding.name === 'replacement')
          throw new RangeError(`Unknown encoding: ${label}`);
        if (!encoders[encoding.name])
          throw new Error('Encoder not present. Did you forget to include encoding-indexes.js first?');
        enc._encoding = encoding;
      } else {
        enc._encoding = getEncoding('utf-8');
        if (label !== undefined && typeof console !== 'undefined') {
          console.warn('TextEncoder constructor called with encoding label, which is ignored.');
        }
      }

    }
  
    /**
     * The encoding attribute's getter must return encoding's name.
     */
    get encoding() {
      return this._encoding.name.toLowerCase();
    }
  
    /**
     * @param {string=} opt_string The string to encode.
     * @param {Object=} options
     * @return {!Uint8Array} Encoded bytes, as a Uint8Array.
     */
    encode(opt_string = '', options = {}) {
      opt_string = String(opt_string);
      options = ToDictionary(options);
  
      if (!this._do_not_flush)
        this._encoder = encoders[this._encoding.name]({ fatal: this._fatal === 'fatal' });
      this._do_not_flush = Boolean(options.stream);
  
      const input = new Stream(stringToCodePoints(opt_string));
      const output = [];
  
      let result;
      while (true) {
        const token = input.read();
        if (token === end_of_stream) break;
        result = this._encoder.handler(input, token);
        if (result === finished) break;
        if (Array.isArray(result))
          output.push(...result);
        else
          output.push(result);
      }
  
      if (!this._do_not_flush) {
        while (true) {
          result = this._encoder.handler(input, input.read());
          if (result === finished) break;
          if (Array.isArray(result))
            output.push(...result);
          else
            output.push(result);
        }
        this._encoder = null;
      }
  
      return new Uint8Array(output);
    }
  }
  
  // Usage of the TextEncoder class
  // const encoder = new TextEncoder('utf-8');
  // const encodedBytes = encoder.encode('Hello, World!');
  

  //
  // 9. The encoding
  //

  // 9.1 utf-8

  // 9.1.1 utf-8 decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  class UTF8Decoder {
	  // utf-8's decoder's has an associated utf-8 code point, utf-8
	  // bytes seen, and utf-8 bytes needed (all initially 0), a utf-8
	  // lower boundary (initially 0x80), and a utf-8 upper boundary
	  // (initially 0xBF).
    constructor({ fatal = false }) {
		 this.fatal = fatal;
		    this.utf8_code_point = 0;
		    this.utf8_bytes_needed = 0;
		    this.utf8_bytes_seen = 0;
		    this.utf8_lower_boundary = 0x80;
		    this.utf8_upper_boundary = 0xBF;
	}


    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point.
     */
    handler(stream, bite) {
        if (bite === end_of_stream && this.utf8_bytes_needed !== 0) {
          this.utf8_bytes_needed = 0;
          return this.fatal ? decoderError(this.fatal) : null;
        }
    
        if (bite === end_of_stream)
          return finished;
    
        if (this.utf8_bytes_needed === 0) {
          if (inRange(bite, 0x00, 0x7F)) {
            return bite;
          } else if (inRange(bite, 0xC2, 0xDF)) {
            this.utf8_bytes_needed = 1;
            this.utf8_code_point = bite & 0x1F;
            return null;
          } else if (inRange(bite, 0xE0, 0xEF)) {
            if (bite === 0xE0) this.utf8_lower_boundary = 0xA0;
            if (bite === 0xED) this.utf8_upper_boundary = 0x9F;
            this.utf8_bytes_needed = 2;
            this.utf8_code_point = bite & 0xF;
            return null;
          } else if (inRange(bite, 0xF0, 0xF4)) {
            if (bite === 0xF0) this.utf8_lower_boundary = 0x90;
            if (bite === 0xF4) this.utf8_upper_boundary = 0x8F;
            this.utf8_bytes_needed = 3;
            this.utf8_code_point = bite & 0x7;
            return null;
          } else {
            return this.fatal ? decoderError(this.fatal) : null;
          }
        }
    
        if (!inRange(bite, this.utf8_lower_boundary, this.utf8_upper_boundary)) {
          this.utf8_code_point = this.utf8_bytes_needed = this.utf8_bytes_seen = 0;
          this.utf8_lower_boundary = 0x80;
          this.utf8_upper_boundary = 0xBF;
          stream.prepend(bite);
          return this.fatal ? decoderError(this.fatal) : null;
        }
    
        this.utf8_lower_boundary = 0x80;
        this.utf8_upper_boundary = 0xBF;
    
        this.utf8_code_point = (this.utf8_code_point << 6) | (bite & 0x3F);
        this.utf8_bytes_seen += 1;
    
        if (this.utf8_bytes_seen !== this.utf8_bytes_needed)
          return null;
    
        const code_point = this.utf8_code_point;
        this.utf8_code_point = this.utf8_bytes_needed = this.utf8_bytes_seen = 0;
    
        return code_point;
      }
    }

  // 9.1.2 utf-8 encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  class UTF8Encoder {
    constructor({ fatal = false }) {
      this.fatal = fatal;
    }
  
    handler(stream, code_point) {
      if (code_point === end_of_stream)
        return finished;
  
      if (isASCIICodePoint(code_point))
        return code_point;
  
      let count, offset;
      if (inRange(code_point, 0x0080, 0x07FF)) {
        count = 1;
        offset = 0xC0;
      } else if (inRange(code_point, 0x0800, 0xFFFF)) {
        count = 2;
        offset = 0xE0;
      } else if (inRange(code_point, 0x10000, 0x10FFFF)) {
        count = 3;
        offset = 0xF0;
      }
  
      let bytes = [(code_point >> (6 * count)) + offset];
  
      while (count > 0) {
        let temp = code_point >> (6 * (count - 1));
        bytes.push(0x80 | (temp & 0x3F));
        count -= 1;
      }
  
      return bytes;
    }
  }

  /** @param {{fatal: boolean}} options */
  encoders['UTF-8'] = options => new UTF8Encoder(options);

  /** @param {{fatal: boolean}} options */
  decoders['UTF-8'] = options => new UTF8Decoder(options);

  //
  // 10. Legacy single-byte encodings
  //

  // 10.1 single-byte decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {!Array.<number>} index The encoding index.
   * @param {{fatal: boolean}} options
   */
  class SingleByteDecoder {
    constructor(index, { fatal = false } = {}) {
      this.index = index;
      this.fatal = fatal;
    }
  
    handler(stream, bite) {
      if (bite === end_of_stream) return finished;
  
      if (isASCIIByte(bite)) return bite;
  
      const code_point = this.index[bite - 0x80];
  
      if (code_point === null) return decoderError(this.fatal);
  
      return code_point;
    }
  }

  // 10.2 single-byte encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {!Array.<?number>} index The encoding index.
   * @param {{fatal: boolean}} options
   */
  class SingleByteEncoder {
    constructor(index, { fatal = false } = {}) {
      this.index = index;
      this.fatal = fatal;
    }
  
    handler(stream, code_point) {
      if (code_point === end_of_stream) return finished;
  
      if (isASCIICodePoint(code_point)) return code_point;
  
      let pointer = indexPointerFor(code_point, this.index);
  
      if (pointer === null) return encoderError(code_point);
  
      return pointer + 0x80;
    }
  }

  (function() {
    if (!encodingIndexes) return;
    // Assuming 'encodings' is an array of encoding categories defined elsewhere
    encodings.forEach(category => {
      if (category.heading !== 'Legacy single-byte encodings') return;
  
      category.encodings.forEach(encoding => {
        const name = encoding.name;
        const idx = index(name.toLowerCase());
  
        decoders[name] = options => new SingleByteDecoder(idx, options);
        encoders[name] = options => new SingleByteEncoder(idx, options);
      });
    });
  })();

  //
  // 11. Legacy multi-byte Chinese (simplified) encodings
  //

  // 11.1 gbk

  // 11.1.1 gbk decoder
  // gbk's decoder is gb18030's decoder.
  /** @param {{fatal: boolean}} options */
  decoders['GBK'] = options => new GB18030Decoder(options);

  // 11.1.2 gbk encoder
  // gbk's encoder is gb18030's encoder with its gbk flag set.
  /** @param {{fatal: boolean}} options */
  encoders['GBK'] = options => new GB18030Encoder(options, true);

  // 11.2 gb18030
  // 11.2.1 gb18030 decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  class GB18030Decoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
      this.gb18030_first = 0x00;
      this.gb18030_second = 0x00;
      this.gb18030_third = 0x00;
    }
  
    handler(stream, bite) {
      if (bite === end_of_stream && this.gb18030_first === 0x00 &&
          this.gb18030_second === 0x00 && this.gb18030_third === 0x00) {
        return finished;
      }
      if (bite === end_of_stream &&
          (this.gb18030_first !== 0x00 || this.gb18030_second !== 0x00 ||
           this.gb18030_third !== 0x00)) {
        this.gb18030_first = 0x00;
        this.gb18030_second = 0x00;
        this.gb18030_third = 0x00;
        return decoderError(this.fatal);
      }

      let code_point;

      if (this.gb18030_third !== 0x00) {
        code_point = null;
        if (inRange(bite, 0x30, 0x39)) {
          code_point = indexGB18030RangesCodePointFor(
              (((this.gb18030_first - 0x81) * 10 + this.gb18030_second - 0x30) * 126 +
               this.gb18030_third - 0x81) * 10 + bite - 0x30);
        }
        let buffer = [this.gb18030_second, this.gb18030_third, bite];

        this.gb18030_first = 0x00;
        this.gb18030_second = 0x00;
        this.gb18030_third = 0x00;

        if (code_point === null) {
          stream.prepend(buffer);
          return decoderError(this.fatal);
        }
        return code_point;
      }

      if (this.gb18030_second !== 0x00) {
        if (inRange(bite, 0x81, 0xFE)) {
          this.gb18030_third = bite;
          return null;
        }

        stream.prepend([this.gb18030_second, bite]);
        this.gb18030_first = 0x00;
        this.gb18030_second = 0x00;
        return decoderError(this.fatal);
      }

      if (this.gb18030_first !== 0x00) {
        if (inRange(bite, 0x30, 0x39)) {
          this.gb18030_second = bite;
          return null;
        }
        let lead = this.gb18030_first;
        let pointer = null;
        this.gb18030_first = 0x00;
        let offset = bite < 0x7F ? 0x40 : 0x41;

        if (inRange(bite, 0x40, 0x7E) || inRange(bite, 0x80, 0xFE))
          pointer = (lead - 0x81) * 190 + (bite - offset);

        code_point = pointer === null ? null :
            indexCodePointFor(pointer, index('gb18030'));

        if (code_point === null && isASCIIByte(bite))
          stream.prepend(bite);

        if (code_point === null)
          return decoderError(this.fatal);

        return code_point;
      }

      if (isASCIIByte(bite))
        return bite;

      if (bite === 0x80)
        return 0x20AC;

      if (inRange(bite, 0x81, 0xFE)) {
        this.gb18030_first = bite;
        return null;
      }

      return decoderError(this.fatal);
    }
  }

  // 11.2.2 gb18030 encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   * @param {boolean=} gbk_flag
   */
  class GB18030Encoder {
    constructor(options, gbk_flag = false) {
      this.fatal = options.fatal;
      this.gbk_flag = gbk_flag;
    }
  
    handler(stream, code_point) {
      if (code_point === end_of_stream)
        return finished;
      if (isASCIICodePoint(code_point))
        return code_point;
      if (code_point === 0xE5E5)
        return encoderError(code_point);
      if (this.gbk_flag && code_point === 0x20AC)
        return 0x80;
      let pointer = indexPointerFor(code_point, index('gb18030'));
      if (pointer !== null) {
        let lead = floor(pointer / 190) + 0x81;
        let trail = pointer % 190;
        let offset = trail < 0x3F ? 0x40 : 0x41;
        return [lead, trail + offset];
      }
      if (this.gbk_flag)
        return encoderError(code_point);
      pointer = indexGB18030RangesPointerFor(code_point);
      let byte1 = floor(pointer / 10 / 126 / 10);
      pointer -= byte1 * 10 * 126 * 10;
      let byte2 = floor(pointer / 10 / 126);
      pointer -= byte2 * 10 * 126;
      let byte3 = floor(pointer / 10);
      let byte4 = pointer - byte3 * 10;
      return [byte1 + 0x81,
              byte2 + 0x30,
              byte3 + 0x81,
              byte4 + 0x30];
    }
  }

  /** @param {{fatal: boolean}} options */
  encoders['gb18030'] = options => new GB18030Encoder(options);

  /** @param {{fatal: boolean}} options */
  decoders['gb18030'] = options => new GB18030Decoder(options);


  //
  // 12. Legacy multi-byte Chinese (traditional) encodings
  //

  // 12.1 Big5

  // 12.1.1 Big5 decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  class Big5Decoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
      this.Big5_lead = 0x00;
    }
  
    handler(stream, bite) {
      if (bite === end_of_stream && this.Big5_lead !== 0x00) {
        this.Big5_lead = 0x00;
        return decoderError(this.fatal);
      }
  
      if (bite === end_of_stream && this.Big5_lead === 0x00)
        return finished;
  
      if (this.Big5_lead !== 0x00) {
        const lead = this.Big5_lead;
        let pointer = null;
        this.Big5_lead = 0x00;
  
        const offset = bite < 0x7F ? 0x40 : 0x62;
  
        if (inRange(bite, 0x40, 0x7E) || inRange(bite, 0xA1, 0xFE))
          pointer = (lead - 0x81) * 157 + (bite - offset);
  
        switch (pointer) {
          case 1133: return [0x00CA, 0x0304];
          case 1135: return [0x00CA, 0x030C];
          case 1164: return [0x00EA, 0x0304];
          case 1166: return [0x00EA, 0x030C];
        }
  
        let code_point = (pointer === null) ? null :
            indexCodePointFor(pointer, index('big5'));
  
        if (code_point === null && isASCIIByte(bite))
          stream.prepend(bite);
  
        if (code_point === null)
          return decoderError(this.fatal);
  
        return code_point;
      }
  
      if (isASCIIByte(bite))
        return bite;
  
      if (inRange(bite, 0x81, 0xFE)) {
        this.Big5_lead = bite;
        return null;
      }
  
      return decoderError(this.fatal);
    }
  }

  // 12.1.2 Big5 encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  class Big5Encoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
    }
  
    handler(stream, code_point) {
      if (code_point === end_of_stream)
        return finished;
  
      if (isASCIICodePoint(code_point))
        return code_point;
  
      const pointer = indexBig5PointerFor(code_point);
  
      if (pointer === null)
        return encoderError(code_point);
  
      const lead = floor(pointer / 157) + 0x81;
  
      if (lead < 0xA1)
        return encoderError(code_point);
  
      const trail = pointer % 157;
      const offset = trail < 0x3F ? 0x40 : 0x62;
  
      return [lead, trail + offset];
    }
  }
  
  /** @param {{fatal: boolean}} options */
  encoders['Big5'] = options => new Big5Encoder(options);
  decoders['Big5'] = options => new Big5Decoder(options);

  //
  // 13. Legacy multi-byte Japanese encodings
  //

  // 13.1 euc-jp

  // 13.1.1 euc-jp decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  class EUCJPDecoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
      this.eucjp_jis0212_flag = false;
      this.eucjp_lead = 0x00;
    }
  
    handler(stream, bite) {
      if (bite === end_of_stream && this.eucjp_lead !== 0x00) {
        this.eucjp_lead = 0x00;
        return decoderError(this.fatal);
      }
  
      if (bite === end_of_stream && this.eucjp_lead === 0x00)
        return finished;
  
      if (this.eucjp_lead === 0x8E && inRange(bite, 0xA1, 0xDF)) {
        this.eucjp_lead = 0x00;
        return 0xFF61 - 0xA1 + bite;
      }
  
      if (this.eucjp_lead === 0x8F && inRange(bite, 0xA1, 0xFE)) {
        this.eucjp_jis0212_flag = true;
        this.eucjp_lead = bite;
        return null;
      }
  
      if (this.eucjp_lead !== 0x00) {
        const lead = this.eucjp_lead;
        this.eucjp_lead = 0x00;
  
        let code_point = null;
        if (inRange(lead, 0xA1, 0xFE) && inRange(bite, 0xA1, 0xFE)) {
          code_point = indexCodePointFor(
            (lead - 0xA1) * 94 + (bite - 0xA1),
            index(!this.eucjp_jis0212_flag ? 'jis0208' : 'jis0212'));
        }
  
        this.eucjp_jis0212_flag = false;
  
        if (!inRange(bite, 0xA1, 0xFE))
          stream.prepend(bite);
  
        if (code_point === null)
          return decoderError(this.fatal);
  
        return code_point;
      }
  
      if (isASCIIByte(bite))
        return bite;
  
      if (bite === 0x8E || bite === 0x8F || inRange(bite, 0xA1, 0xFE)) {
        this.eucjp_lead = bite;
        return null;
      }
  
      return decoderError(this.fatal);
    }
  }

  // 13.1.2 euc-jp encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  class EUCJPEncoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
    }
  
    handler(stream, code_point) {
      if (code_point === end_of_stream)
        return finished;
  
      if (isASCIICodePoint(code_point))
        return code_point;
  
      if (code_point === 0x00A5)
        return 0x5C;
  
      if (code_point === 0x203E)
        return 0x7E;
  
      if (inRange(code_point, 0xFF61, 0xFF9F))
        return [0x8E, code_point - 0xFF61 + 0xA1];
  
      if (code_point === 0x2212)
        code_point = 0xFF0D;
  
      const pointer = indexPointerFor(code_point, index('jis0208'));
  
      if (pointer === null)
        return encoderError(code_point);
  
      const lead = floor(pointer / 94) + 0xA1;
      const trail = pointer % 94 + 0xA1;
  
      return [lead, trail];
    }
  }

  /** @param {{fatal: boolean}} options */
  encoders['EUC-JP'] = options => new EUCJPEncoder(options);
  decoders['EUC-JP'] = options => new EUCJPDecoder(options);

  // 13.2 iso-2022-jp

  // 13.2.1 iso-2022-jp decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  class ISO2022JPDecoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
      this.states = {
        ASCII: 0,
        Roman: 1,
        Katakana: 2,
        LeadByte: 3,
        TrailByte: 4,
        EscapeStart: 5,
        Escape: 6
      };
      this.iso2022jp_decoder_state = this.states.ASCII;
      this.iso2022jp_decoder_output_state = this.states.ASCII;
      this.iso2022jp_lead = 0x00;
      this.iso2022jp_output_flag = false;
    }
  
    handler(stream, bite) {
      switch (this.iso2022jp_decoder_state) {
        default:
        case this.states.ASCII:
          if (bite === 0x1B) {
            this.iso2022jp_decoder_state = this.states.EscapeStart;
            return null;
          }
          if (inRange(bite, 0x00, 0x7F) && bite !== 0x0E && bite !== 0x0F && bite !== 0x1B) {
            this.iso2022jp_output_flag = false;
            return bite;
          }
          if (bite === end_of_stream) return finished;
          this.iso2022jp_output_flag = false;
          return decoderError(this.fatal);
  
        case this.states.Roman:
          if (bite === 0x1B) {
            this.iso2022jp_decoder_state = this.states.EscapeStart;
            return null;
          }
          if (bite === 0x5C) {
            this.iso2022jp_output_flag = false;
            return 0x00A5;
          }
          if (bite === 0x7E) {
            this.iso2022jp_output_flag = false;
            return 0x203E;
          }
          if (inRange(bite, 0x00, 0x7F) && bite !== 0x0E && bite !== 0x0F && bite !== 0x1B && bite !== 0x5C && bite !== 0x7E) {
            this.iso2022jp_output_flag = false;
            return bite;
          }
          if (bite === end_of_stream) return finished;
          this.iso2022jp_output_flag = false;
          return decoderError(this.fatal);
  
        case this.states.Katakana:
          if (bite === 0x1B) {
            this.iso2022jp_decoder_state = this.states.EscapeStart;
            return null;
          }
          if (inRange(bite, 0x21, 0x5F)) {
            this.iso2022jp_output_flag = false;
            return 0xFF61 - 0x21 + bite;
          }
          if (bite === end_of_stream) return finished;
          this.iso2022jp_output_flag = false;
          return decoderError(this.fatal);
  
        case this.states.LeadByte:
          if (bite === 0x1B) {
            this.iso2022jp_decoder_state = this.states.EscapeStart;
            return null;
          }
          if (inRange(bite, 0x21, 0x7E)) {
            this.iso2022jp_output_flag = false;
            this.iso2022jp_lead = bite;
            this.iso2022jp_decoder_state = this.states.TrailByte;
          return null;
        }

        if (bite === end_of_stream) return finished;
          this.iso2022jp_output_flag = false;
                return decoderError(this.fatal);
        
              case this.states.TrailByte:
                if (bite === 0x1B) {
                  this.iso2022jp_decoder_state = this.states.EscapeStart;
                  return decoderError(this.fatal);
                }
                if (inRange(bite, 0x21, 0x7E)) {
                  this.iso2022jp_decoder_state = this.states.LeadByte;
                  let pointer = (this.iso2022jp_lead - 0x21) * 94 + bite - 0x21;
                  let code_point = indexCodePointFor(pointer, index('jis0208'));
                  if (code_point === null) return decoderError(this.fatal);
                  return code_point;
                }
                if (bite === end_of_stream) {
                  this.iso2022jp_decoder_state = this.states.LeadByte;
                  stream.prepend(bite);
                  return decoderError(this.fatal);
                }
                this.iso2022jp_decoder_state = this.states.LeadByte;
                return decoderError(this.fatal);
        
              case this.states.EscapeStart:
                if (bite === 0x24 || bite === 0x28) {
                  this.iso2022jp_lead = bite;
                  this.iso2022jp_decoder_state = this.states.Escape;
                  return null;
                }
                stream.prepend(bite);
                this.iso2022jp_output_flag = false;
                this.iso2022jp_decoder_state = this.iso2022jp_decoder_output_state;
                return decoderError(this.fatal);
        
              case this.states.Escape:
                let lead = this.iso2022jp_lead;
                this.iso2022jp_lead = 0x00;
                let state = null;
                if (lead === 0x28 && bite === 0x42) state = this.states.ASCII;
                if (lead === 0x28 && bite === 0x4A) state = this.states.Roman;
                if (lead === 0x24 && (bite === 0x40 || bite === 0x42)) state = this.states.LeadByte;
                if (state !== null) {
                  this.iso2022jp_decoder_state = this.iso2022jp_decoder_output_state = state;
                  let output_flag = this.iso2022jp_output_flag;
                  this.iso2022jp_output_flag = true;
                  return !output_flag ? null : decoderError(this.fatal);
                }
                stream.prepend([lead, bite]);
                this.iso2022jp_output_flag = false;
                this.iso2022jp_decoder_state = this.iso2022jp_decoder_output_state;
                return decoderError(this.fatal);
            }
          }
    }

  // 13.2.2 iso-2022-jp encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  class ISO2022JPEncoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
      this.states = {
        ASCII: 0,
        Roman: 1,
        jis0208: 2
      };
      this.iso2022jpState = this.states.ASCII;
    }
  
    handler(stream, codePoint) {
      if (codePoint === end_of_stream && this.iso2022jpState !== this.states.ASCII) {
        stream.prepend(codePoint);
        this.iso2022jpState = this.states.ASCII;
        return [0x1B, 0x28, 0x42];
      }
  
      if (codePoint === end_of_stream && this.iso2022jpState === this.states.ASCII)
        return finished;
  
      if ((this.iso2022jpState === this.states.ASCII || this.iso2022jpState === this.states.Roman) &&
          (codePoint === 0x000E || codePoint === 0x000F || codePoint === 0x001B)) {
        return encoderError(0xFFFD);
      }
  
      if (this.iso2022jpState === this.states.ASCII && isASCIICodePoint(codePoint))
        return codePoint;
  
      if (this.iso2022jpState === this.states.Roman &&
          ((isASCIICodePoint(codePoint) && codePoint !== 0x005C && codePoint !== 0x007E) ||
           (codePoint === 0x00A5 || codePoint === 0x203E))) {
        if (isASCIICodePoint(codePoint))
          return codePoint;
        if (codePoint === 0x00A5)
          return 0x5C;
        if (codePoint === 0x203E)
          return 0x7E;
      }
  
      if (isASCIICodePoint(codePoint) && this.iso2022jpState !== this.states.ASCII) {
        stream.prepend(codePoint);
        this.iso2022jpState = this.states.ASCII;
        return [0x1B, 0x28, 0x42];
      }
  
      if ((codePoint === 0x00A5 || codePoint === 0x203E) && this.iso2022jpState !== this.states.Roman) {
        stream.prepend(codePoint);
        this.iso2022jpState = this.states.Roman;
        return [0x1B, 0x28, 0x4A];
      }
  
      if (codePoint === 0x2212)
        codePoint = 0xFF0D;
  
      const pointer = indexPointerFor(codePoint, index('jis0208'));
      if (pointer === null)
        return encoderError(codePoint);
  
      if (this.iso2022jpState !== this.states.jis0208) {
        stream.prepend(codePoint);
        this.iso2022jpState = this.states.jis0208;
        return [0x1B, 0x24, 0x42];
      }
  
      const lead = floor(pointer / 94) + 0x21;
      const trail = pointer % 94 + 0x21;
      return [lead, trail];
    }
  }

  /** @param {{fatal: boolean}} options */
  encoders['ISO-2022-JP'] = options => new ISO2022JPEncoder(options);
  decoders['ISO-2022-JP'] = options => new ISO2022JPDecoder(options);

  // 13.3 Shift_JIS

  // 13.3.1 Shift_JIS decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  class ShiftJISDecoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
      this.Shift_JIS_lead = 0x00;
    }
  
    handler(stream, bite) {
      if (bite === end_of_stream && this.Shift_JIS_lead !== 0x00) {
        this.Shift_JIS_lead = 0x00;
        return decoderError(this.fatal);
      }
  
      if (bite === end_of_stream && this.Shift_JIS_lead === 0x00)
        return finished;
  
      if (this.Shift_JIS_lead !== 0x00) {
        const lead = this.Shift_JIS_lead;
        let pointer = null;
        this.Shift_JIS_lead = 0x00;
  
        const offset = bite < 0x7F ? 0x40 : 0x41;
        const lead_offset = lead < 0xA0 ? 0x81 : 0xC1;
  
        if (inRange(bite, 0x40, 0x7E) || inRange(bite, 0x80, 0xFC))
          pointer = (lead - lead_offset) * 188 + bite - offset;
  
        if (inRange(pointer, 8836, 10715))
          return 0xE000 - 8836 + pointer;
  
        let code_point = (pointer === null) ? null : indexCodePointFor(pointer, index('jis0208'));
  
        if (code_point === null && isASCIIByte(bite))
          stream.prepend(bite);
  
        if (code_point === null)
          return decoderError(this.fatal);
  
        return code_point;
      }
  
      if (isASCIIByte(bite) || bite === 0x80)
        return bite;
  
      if (inRange(bite, 0xA1, 0xDF))
        return 0xFF61 - 0xA1 + bite;
  
      if (inRange(bite, 0x81, 0x9F) || inRange(bite, 0xE0, 0xFC)) {
        this.Shift_JIS_lead = bite;
        return null;
      }
  
      return decoderError(this.fatal);
    }
  }

  // 13.3.2 Shift_JIS encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  class ShiftJISEncoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
    }
  
    handler(stream, code_point) {
      if (code_point === end_of_stream)
        return finished;
  
      if (isASCIICodePoint(code_point) || code_point === 0x0080)
        return code_point;
  
      if (code_point === 0x00A5)
        return 0x5C;
  
      if (code_point === 0x203E)
        return 0x7E;
  
      if (inRange(code_point, 0xFF61, 0xFF9F))
        return code_point - 0xFF61 + 0xA1;
  
      if (code_point === 0x2212)
        code_point = 0xFF0D;
  
      const pointer = indexShiftJISPointerFor(code_point);
  
      if (pointer === null)
        return encoderError(code_point);
  
      const lead = floor(pointer / 188);
      const lead_offset = lead < 0x1F ? 0x81 : 0xC1;
      const trail = pointer % 188;
      const offset = trail < 0x3F ? 0x40 : 0x41;
  
      return [lead + lead_offset, trail + offset];
    }
  }

  /** @param {{fatal: boolean}} options */
  encoders['Shift_JIS'] = options => new ShiftJISEncoder(options);
  decoders['Shift_JIS'] = options => new ShiftJISDecoder(options);

  //
  // 14. Legacy multi-byte Korean encodings
  //

  // 14.1 euc-kr

  // 14.1.1 euc-kr decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  class EUCKRDecoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
      this.euckr_lead = 0x00;
    }
  
    handler(stream, bite) {
      if (bite === end_of_stream && this.euckr_lead !== 0x00) {
        this.euckr_lead = 0x00;
        return decoderError(this.fatal);
      }
  
      if (bite === end_of_stream && this.euckr_lead === 0x00)
        return finished;
  
      if (this.euckr_lead !== 0x00) {
        const lead = this.euckr_lead;
        let pointer = null;
        this.euckr_lead = 0x00;
  
        if (inRange(bite, 0x41, 0xFE))
          pointer = (lead - 0x81) * 190 + (bite - 0x41);
  
        let code_point = (pointer === null) ? null : indexCodePointFor(pointer, index('euc-kr'));
  
        if (pointer === null && isASCIIByte(bite))
          stream.prepend(bite);
  
        if (code_point === null)
          return decoderError(this.fatal);
  
        return code_point;
      }
  
      if (isASCIIByte(bite))
        return bite;
  
      if (inRange(bite, 0x81, 0xFE)) {
        this.euckr_lead = bite;
        return null;
      }
  
      return decoderError(this.fatal);
    }
  }

  // 14.1.2 euc-kr encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  class EUCKREncoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
    }
  
    handler(stream, code_point) {
      if (code_point === end_of_stream)
        return finished;
  
      if (isASCIICodePoint(code_point))
        return code_point;
  
      const pointer = indexPointerFor(code_point, index('euc-kr'));
  
      if (pointer === null)
        return encoderError(code_point);
  
      const lead = floor(pointer / 190) + 0x81;
      const trail = (pointer % 190) + 0x41;
  
      return [lead, trail];
    }
  }

  /** @param {{fatal: boolean}} options */
  encoders['EUC-KR'] = options => new EUCKREncoder(options);
  decoders['EUC-KR'] = options => new EUCKRDecoder(options);


  //
  // 15. Legacy miscellaneous encodings
  //

  // 15.1 replacement

  // Not needed - API throws RangeError

  // 15.2 Common infrastructure for utf-16be and utf-16le

  /**
   * @param {number} codeUnit
   * @param {boolean} utf16be
   * @return {!Array.<number>} bytes
   */
  function convertCodeUnitToBytes(codeUnit, utf16be) {
    const byte1 = codeUnit >> 8;
    const byte2 = codeUnit & 0x00FF;
    return utf16be ? [byte1, byte2] : [byte2, byte1];
  }

  // 15.2.1 shared utf-16 decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {boolean} utf16_be True if big-endian, false if little-endian.
   * @param {{fatal: boolean}} options
   */
  class UTF16Decoder {
    constructor(utf16_be, { fatal = false } = {}) {
      this.utf16_be = utf16_be;
      this.fatal = fatal;
      this.utf16_lead_byte = null;
      this.utf16_lead_surrogate = null;
    }
  
    handler(stream, bite) {
      if (bite === end_of_stream && (this.utf16_lead_byte !== null || this.utf16_lead_surrogate !== null)) {
        return decoderError(this.fatal);
      }
  
      if (bite === end_of_stream && this.utf16_lead_byte === null && this.utf16_lead_surrogate === null) {
        return finished;
      }
  
      if (this.utf16_lead_byte === null) {
        this.utf16_lead_byte = bite;
        return null;
      }
  
      let codeUnit;
      if (this.utf16_be) {
        codeUnit = (this.utf16_lead_byte << 8) + bite;
      } else {
        codeUnit = (bite << 8) + this.utf16_lead_byte;
      }
      this.utf16_lead_byte = null;
  
      if (this.utf16_lead_surrogate !== null) {
        const leadSurrogate = this.utf16_lead_surrogate;
        this.utf16_lead_surrogate = null;
  
        if (inRange(codeUnit, 0xDC00, 0xDFFF)) {
          return 0x10000 + (leadSurrogate - 0xD800) * 0x400 + (codeUnit - 0xDC00);
        }
  
        stream.prepend(convertCodeUnitToBytes(codeUnit, this.utf16_be));
        return decoderError(this.fatal);
      }
  
      if (inRange(codeUnit, 0xD800, 0xDBFF)) {
        this.utf16_lead_surrogate = codeUnit;
        return null;
      }
  
      if (inRange(codeUnit, 0xDC00, 0xDFFF)) {
        return decoderError(this.fatal);
      }
  
      return codeUnit;
    }
  }

  // 15.2.2 shared utf-16 encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {boolean} utf16_be True if big-endian, false if little-endian.
   * @param {{fatal: boolean}} options
   */
  class UTF16Encoder {
    constructor(utf16_be, { fatal = false } = {}) {
      this.fatal = fatal;
      this.utf16_be = utf16_be;
    }
  
    handler(stream, codePoint) {
      if (codePoint === end_of_stream) {
        return finished;
      }
  
      if (inRange(codePoint, 0x0000, 0xFFFF)) {
        return convertCodeUnitToBytes(codePoint, this.utf16_be);
      }
  
      const lead = convertCodeUnitToBytes(((codePoint - 0x10000) >> 10) + 0xD800, this.utf16_be);
      const trail = convertCodeUnitToBytes(((codePoint - 0x10000) & 0x3FF) + 0xDC00, this.utf16_be);
  
      return lead.concat(trail);
    }
  }

  // 15.3 utf-16be
  // 15.3.1 utf-16be decoder
  /** @param {{fatal: boolean}} options */
  // utf-16be
  encoders['UTF-16BE'] = (options) => new UTF16Encoder(true, options);
  decoders['UTF-16BE'] = (options) => new UTF16Decoder(true, options);

  // 15.4 utf-16le
  // 15.4.1 utf-16le decoder
  /** @param {{fatal: boolean}} options */
  // utf-16le
  encoders['UTF-16LE'] = (options) => new UTF16Encoder(false, options);
  decoders['UTF-16LE'] = (options) => new UTF16Decoder(false, options);

  // 15.5 x-user-defined

  // 15.5.1 x-user-defined decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  class XUserDefinedDecoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
    }
  
    handler(stream, bite) {
      if (bite === end_of_stream) {
        return finished;
      }
  
      if (isASCIIByte(bite)) {
        return bite;
      }
  
      return 0xF780 + bite - 0x80;
    }
  }
  
  // 15.5.2 x-user-defined encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  class XUserDefinedEncoder {
    constructor({ fatal = false } = {}) {
      this.fatal = fatal;
    }
  
    handler(stream, codePoint) {
      if (codePoint === end_of_stream) {
        return finished;
      }
  
      if (isASCIICodePoint(codePoint)) {
        return codePoint;
      }
  
      if (inRange(codePoint, 0xF780, 0xF7FF)) {
        return codePoint - 0xF780 + 0x80;
      }
  
      return encoderError(codePoint);
    }
  }


  /** @param {{fatal: boolean}} options */
  encoders['x-user-defined'] = (options) => new XUserDefinedEncoder(options);
  decoders['x-user-defined'] = (options) => new XUserDefinedDecoder(options);

export default {
	TextEncoder,
	TextDecoder,
	EncodingIndexes: encodingIndexes
};
