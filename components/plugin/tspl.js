import encode from './encoding.js';

class jpPrinter  {
	
   constructor() {
      this.name = "标签模式";
      this.data = "";
      this.command = [];
    }
  
    init() {
      // 初始化代码逻辑
    }

    addCommand (content) {  //将指令转成数组装起
      const code = new encode.TextEncoder(
        'gb18030', {
          NONSTANDARD_allowLegacyEncoding: true
        }).encode(content);
	  code.forEach(byte => this.command.push(byte));
    }

    setSize (pageWidght, pageHeight) { //设置页面大小
      this.data = `SIZE ${pageWidght} mm,${pageHeight} mm\r\n`;
      this.addCommand(this.data);
    }

    setSpeed (printSpeed) { //设置打印机速度
      this.data =  `SPEED ${printSpeed}\r\n`;
      this.addCommand(this.data);
    }

    setDensity (printDensity) { //设置打印机浓度
      this.data = `DENSITY ${printDensity}\r\n`;
      this.addCommand(this.data);
    }

    setGap (printGap) { //传感器
      this.data = `GAP ${printGap} mm\r\n`;
      this.addCommand(this.data);
    }

    setCountry (country) { //选择国际字符集
      /*
      001:USA
      002:French
      003:Latin America
      034:Spanish
      039:Italian
      044:United Kingdom
      046:Swedish
      047:Norwegian
      049:German
       */
      this.data = `COUNTRY ${country}\r\n`;
      this.addCommand(this.data);
    }

    setCodepage (codepage) { //选择国际代码页
      /*
      8-bit codepage 字符集代表
      437:United States
      850:Multilingual
      852:Slavic
      860:Portuguese
      863:Canadian/French
      865:Nordic
      Windows code page
      1250:Central Europe
      1252:Latin I
      1253:Greek
      1254:Turkish
      以下代码页仅限于 12×24 dot 英数字体
      WestEurope:WestEurope
      Greek:Greek
      Hebrew:Hebrew
      EastEurope:EastEurope
      Iran:Iran
      IranII:IranII
      Latvian:Latvian
      Arabic:Arabic
      Vietnam:Vietnam
      Uygur:Uygur
      Thai:Thai
      1252:Latin I
      1257:WPC1257
      1251:WPC1251
      866:Cyrillic
      858:PC858
      747:PC747
      864:PC864
      1001:PC100
      */
      this.data = `CODEPAGE ${codepage}\r\n`;
      this.addCommand(this.data);
    }

    setCls () { //清除打印机缓存
      this.data = "CLS \r\n";
      this.addCommand(this.data);
    }

    setFeed (feed) { //将纸向前推出n
      this.data = `FEED ${feed}\r\n`;
      this.addCommand(this.data);
    }

    setBackFeed (backup) { //将纸向后回拉n
      this.data = `BACKFEED ${backup}\r\n`;
      this.addCommand(this.data);
    }

    setDirection (direction) { //设置打印方向，参考编程手册  正向0,0 反向1,0
      this.data = `DIRECTION ${direction}\r\n`;
      this.addCommand(this.data);
    }

    setReference (x, y) { //设置坐标原点，与打印方向有关
      this.data = `REFERENCE ${x},${y}\r\n`;
      this.addCommand(this.data);
    }

    setFromfeed () { //根据Size进一张标签纸
      this.data = "FORMFEED \r\n";
      this.addCommand(this.data);
	}

    setHome () { //根据Size找到下一张标签纸的位置
      this.data = "HOME \r\n";
      this.addCommand(this.data);
    }

    setSound (level, interval) { //控制蜂鸣器
      this.data = `SOUND ${level},${interval}\r\n`;
      this.addCommand(this.data);
    }

    setLimitfeed (limit) { // 检测垂直间距
      this.data = `LIMITFEED ${limit}\r\n`;
      this.addCommand(this.data);
    }

    setBar (x, y, width, height) { //绘制线条
      this.data = `BAR ${x},${y},${width},${height}\r\n`;
      this.addCommand(this.data);
    }

    setBox (x_start, y_start, x_end, y_end, thickness) { //绘制方框
      this.data = `BOX ${x_start},${y_start},${x_end},${y_end},${thickness}\r\n`;
      this.addCommand(this.data);
    }
	
    setErase (x_start, y_start, x_width, y_height) { //清除指定区域的数据
      this.data = `ERASE ${x_start},${y_start},${x_width},${y_height}\r\n`;
      this.addCommand(this.data);
    }

    setReverse (x_start, y_start, x_width, y_height) { //将指定的区域反相打印
      this.data = `REVERSE ${x_start},${y_start},${x_width},${y_height}\r\n`;
      this.addCommand(this.data);
    }

    setText (x, y, font, x_, y_, str) { //打印文字
      this.data = `TEXT ${x},${y},"${font}",0,${x_},${y_},"${str}"\r\n`;
      this.addCommand(this.data);
    }

    setQR (x, y, level, width, mode, content) { //打印二维码
      this.data = `QRCODE ${x},${y},${level},${width},${mode},0,"${content}"\r\n`;
      this.addCommand(this.data);
    }

    setBarCode (x, y, codetype, height, readable, narrow, wide, content) { //打印条形码
      this.data =  `BARCODE ${x},${y},"${codetype}",${height},${readable},0,${narrow},${wide},"${content}"\r\n`;
      this.addCommand(this.data);
    }

    setBitmap (x, y, mode, res) {  //添加图片，res为画布参数
      console.log(res);
	  let width = parseInt(String((res.width + 7) / 8), 10) * 8; // 确保宽度是8的倍数
      let height = res.height;
	  console.log(width + "--" + height);
      let pointList = [];
      let data = `BITMAP ${x},${y},${width},${height},${mode},`;
      this.addCommand(data);
	  
       for (let i = 0; i < height; ++i) {
            for (let j = 0; j < width; j += 8) {
              let byte = 0;
              for (let k = 0; k < 8; ++k) {
                let index = (i * res.width + j + k) * 4;
                // 检查像素是否为黑色
                if (res.data[index] === 0 && res.data[index + 1] === 0 && res.data[index + 2] === 0 && res.data[index + 3] === 0) {
                  byte |= (1 << (7 - k)); // 设置位为1
                }
              }
              pointList.push(byte);
            }
          }
      
          // 将点列表转换为打印机命令
          pointList.forEach(byte => {
            this.command.push(byte);
          });
    }

    setPagePrint () { //打印页面
      this.data = "PRINT 1,1\r\n";
      this.addCommand(this.data);
    }
	
    //获取打印数据
    getData() {
      return this.command;
    }

}

// module.exports.jpPrinter = jpPrinter;
export default jpPrinter;