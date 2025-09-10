import encode from './encoding.js';

// var encode = require("./encoding.js")
// var app = getApp();
class jpPrinter {
	
  constructor() {
    this.name = "账单模式";
    this.data = [];
    this.bar = ["UPC-A", "UPC-E", "EAN13", "EAN8", "CODE39", "ITF", "CODABAR", "CODE93", "CODE128"];
  }

  init() {
    this.data.push(27);
    this.data.push(64);
  }

  setText(content) {
    const encoder = new encode.TextEncoder('gb18030', { NONSTANDARD_allowLegacyEncoding: true });
    const code = encoder.encode(content);
    code.forEach(byte => this.data.push(byte));
  }

  setBarcodeWidth(width) {
    this.data.push(29);
    this.data.push(119);
    width = Math.max(1, Math.min(6, width));
    this.data.push(width);
  }

  setBarcodeHeight(height) {
    this.data.push(29);
    this.data.push(104);
    this.data.push(height);
  }

  setBarcodeContent(t, content) {
    let ty = 73;
    this.data.push(29);
    this.data.push(107);
    switch (t) {
      case this.bar[0]:
        ty = 65;
        break;
      case this.bar[1]:
        ty = 66;
        break;
      case this.bar[2]:
        ty = 67;
        break;
      case this.bar[3]:
        ty = 68;
        break;
      case this.bar[4]:
        ty = 69;
        break;
      case this.bar[5]:
        ty = 70;
        break;
      case this.bar[6]:
        ty = 71;
        break;
      case this.bar[7]:
        ty = 72;
        break;
      case this.bar[8]:
        ty = 73;
        break;
    }
    this.data.push(ty);
  }

  // 设置二维码大小
  setSelectSizeOfModuleForQRCode(n) {
    this.data.push(29, 40, 107, 3, 0, 49, 67);
    n = Math.max(1, Math.min(15, n));
    this.data.push(n);
  }
  
  // 设置纠错等级
  setSelectErrorCorrectionLevelForQRCode(n) {
    this.data.push(29, 40, 107, 3, 0, 49, 69, n);
  }
  
  // 设置二维码内容
  setStoreQRCodeData(content) {
    const encoder = new encode.TextEncoder('gb18030', { NONSTANDARD_allowLegacyEncoding: true });
    const code = encoder.encode(content);
    this.data.push(29, 40, 107, parseInt((code.length + 3) % 256), parseInt((code.length + 3) / 256), 49, 80, 48);
    code.forEach(byte => this.data.push(byte));
  }
  
  // 打印二维码
  setPrintQRCode() {
    this.data.push(29, 40, 107, 3, 0, 49, 81, 48);
  }
  
  // 移动打印位置到下一个水平定位点的位置
  setHorTab() {
    this.data.push(9);
  }
  
  // 设置绝对打印位置
  setAbsolutePrintPosition(where) {
    this.data.push(27, 36, parseInt(where % 256), parseInt(where / 256));
  }
  
  // 设置相对横向打印位置
  setRelativePrintPosition(where) {
    this.data.push(27, 92, parseInt(where % 256), parseInt(where / 256));
  }
  
  // 对齐方式
  setSelectJustification(which) {
    this.data.push(27, 97, which);
  }
  
  // 设置左边距
  setLeftMargin(n) {
    this.data.push(29, 76, parseInt(n % 256), parseInt(n / 256));
  }
  
  // 设置打印区域宽度
  setPrintingAreaWidth(width) {
    this.data.push(29, 87, parseInt(width % 256), parseInt(width / 256));
  }
  
  // 设置蜂鸣器
  setSound(n, t) {
    this.data.push(27, 66, Math.max(1, Math.min(9, n)), Math.max(1, Math.min(9, t)));
  }
  
  // 设置位图
  setBitmap(res) {
    console.log(res);
    let width = parseInt((res.width + 7) / 8 * 8 / 8);
    let height = res.height;
    let time = 1;
    let temp = res.data.length - width * 32;
    let pointList = [];
    console.log(width + " -- " + height);
    this.data.push(29, 118, 48, 0);
    this.data.push(parseInt((res.width + 7) / 8) * 8 / 8);
    this.data.push(0);
    this.data.push(parseInt(res.height % 256));
    this.data.push(parseInt(res.height / 256));
    console.log(res.data.length);
    console.log("temp=" + temp);
    
    for (let i = 0; i < height; ++i) {
      for (let j = 0; j < width; ++j) {
        for (let k = 0; k < 32; k += 4) {
          let po = {};
          if (res.data[temp] === 0 && res.data[temp + 1] === 0 && res.data[temp + 2] === 0 && res.data[temp + 3] === 0) {
            po.point = 0;
          } else {
            po.point = 1;
          }
          pointList.push(po);
          temp += 4;
        }
      }
      time++;
      temp = res.data.length - width * 32 * time;
    }
    
    for (let i = 0; i < pointList.length; i += 8) {
      let p = pointList[i].point * 128 + pointList[i + 1].point * 64 + pointList[i + 2].point * 32 + pointList[i + 3].point * 16 +
              pointList[i + 4].point * 8 + pointList[i + 5].point * 4 + pointList[i + 6].point * 2 + pointList[i + 7].point;
      this.data.push(p);
    }
  }
  
  // 打印并换行
  setPrint() {
    this.data.push(10);
  }
  
  // 打印并走纸feed个单位
  setPrintAndFeed(feed) {
    this.data.push(27, 74, feed);
  }
  
  // 打印并走纸row行
  setPrintAndFeedRow(row) {
    this.data.push(27, 100, row);
  }
  
  // 获取打印数据
  getData() {
    return this.data;
  }
  
  // Query 方法保持不变，但请注意，uniapp 中不使用 wx 对象，而是使用 uni 对象
  Query() {
    const queryStatus = {};
    let buf;
    let dateView;
  
    queryStatus.getRealtimeStatusTransmission = (n) => { // 查询打印机实时状态
      buf = new ArrayBuffer(3);
      dateView = new DataView(buf);
      dateView.setUint8(0, 16);
      dateView.setUint8(1, 4);
      dateView.setUint8(2, n);
      queryStatus.query(buf);
    };
  
    queryStatus.query = (buf) => {
      uni.writeBLECharacteristicValue({
        deviceId: uni.BLEInformation.deviceId,
        serviceId: uni.BLEInformation.writeServiceId,
        characteristicId: uni.BLEInformation.writeCharaterId,
        value: buf,
        success: (res) => {
          // 处理成功回调
        },
        complete: (res) => {
          console.log(res);
          buf = null;
          dateView = null;
        }
      });
    };
  
    return queryStatus;
    }
}
// module.exports.jpPrinter = jpPrinter;
export default jpPrinter;