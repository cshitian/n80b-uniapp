<template>
	<view class="container">
		<view class="header">
			<view class="logo-section">
				<view class="logo">🖨️</view>
				<text class="app-name">蓝牙打印助手</text>
			</view>
			<text class="welcome-text">欢迎使用蓝牙打印服务</text>
		</view>
		
		<view class="main-section">
			<view class="feature-card">
				<view class="feature-icon">📄</view>
				<view class="feature-info">
					<text class="feature-title">测试标签打印</text>
					<text class="feature-desc">快速打印测试标签</text>
				</view>
			</view>
			
			<view class="action-section">
				<button @click="showPrinterSelector" class="print-button">
					<view class="btn-content">
						<text class="btn-icon">🚀</text>
						<text class="btn-text">开始打印</text>
					</view>
				</button>
			</view>
			

		</view>
		

	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import jpPrinter from '../../components/plugin/tspl.js';

// 已保存的打印机列表
const savedPrinters = ref([]);
const defaultPrinter = ref(null);

onMounted(() => {
  loadSavedPrinters();
});

// 加载已保存的打印机
function loadSavedPrinters() {
  try {
    const saved = uni.getStorageSync('savedPrinters');
    if (saved) {
      savedPrinters.value = saved;
    }
  } catch (error) {
    console.error('加载打印机列表失败:', error);
  }
}

// 开始打印
function showPrinterSelector() {
  loadSavedPrinters();
  
  // 查找默认打印机
  const defaultPrinterData = savedPrinters.value.find(printer => printer.isDefault);
  
  if (!defaultPrinterData) {
    uni.showModal({
      title: '提示',
      content: '请先到"我的"页面添加并设置默认打印机',
      showCancel: true,
      cancelText: '取消',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          uni.switchTab({
            url: '/pages/profile/profile'
          });
        }
      }
    });
    return;
  }
  
  // 直接开始打印流程
  startPrintProcess(defaultPrinterData);
}

// 开始打印流程
async function startPrintProcess(printer) {
  try {
    uni.showLoading({
      title: '正在初始化蓝牙...'
    });
    
    // 1. 初始化蓝牙适配器
    await uni.openBluetoothAdapter();
    
    uni.showLoading({
      title: '正在连接打印机...'
    });
    
    // 2. 尝试连接打印机
    await uni.createBLEConnection({ 
      deviceId: printer.deviceId 
    });
    
    uni.showLoading({
      title: '正在获取服务...'
    });
    
    // 3. 获取服务和特征值
    const services = await uni.getBLEDeviceServices({ 
      deviceId: printer.deviceId 
    });
    
    console.log(`deviceId = [${printer.deviceId}] services =`, services.services);
    
    let writeService = null;
    let writeCharacteristic = null;
    
    // 查找可写入的特征值
    for (const service of services.services) {
      try {
        const characteristics = await uni.getBLEDeviceCharacteristics({
          deviceId: printer.deviceId,
          serviceId: service.uuid
        });
        
        console.log(`serviceId = [${service.uuid}] characteristics =`, characteristics.characteristics);
        
        for (const characteristic of characteristics.characteristics) {
          if (characteristic.properties.write) {
            writeService = service.uuid;
            writeCharacteristic = characteristic.uuid;
            console.log(`deviceId = [${printer.deviceId}] serviceId = [${writeService}] characteristics=[${writeCharacteristic}]`);
            break;
          }
        }
        if (writeService) break;
      } catch (charError) {
        console.warn('获取特征值失败:', charError);
        continue;
      }
    }
    
    if (!writeService || !writeCharacteristic) {
      throw new Error('未找到可写入的蓝牙特征值，请检查打印机是否支持');
    }
    
    uni.hideLoading();
    uni.showLoading({
      title: '正在打印...'
    });
    
    // 4. 执行打印
    await executePrint(printer.deviceId, writeService, writeCharacteristic);
    
    uni.hideLoading();
    uni.showToast({
      title: '打印完成',
      icon: 'success'
    });
    
    // 5. 延迟关闭蓝牙连接
    setTimeout(async () => {
      try {
        await uni.closeBLEConnection({
          deviceId: printer.deviceId
        });
        console.log('蓝牙连接已关闭');
      } catch (closeError) {
        console.warn('关闭蓝牙连接失败:', closeError);
      }
    }, 2000);
    
  } catch (error) {
    uni.hideLoading();
    console.error('打印失败:', error);
    
    let errorMessage = '打印失败，请重试';
    let errorTitle = '打印失败';
    
    if (error.errMsg) {
      if (error.errMsg.includes('not init')) {
        errorTitle = '蓝牙未初始化';
        errorMessage = '请检查小程序蓝牙权限是否开启';
      } else if (error.errMsg.includes('not available')) {
        errorTitle = '蓝牙不可用';
        errorMessage = '请检查手机蓝牙是否开启';
      } else if (error.errMsg.includes('connection fail') || error.errMsg.includes('connect fail')) {
        errorTitle = '连接失败';
        errorMessage = '无法连接到打印机，请检查：\n1. 打印机是否开启\n2. 打印机是否在附近\n3. 打印机是否已被其他设备连接';
      } else if (error.errMsg.includes('device not found')) {
        errorTitle = '设备未找到';
        errorMessage = '找不到打印机设备，请重新添加打印机';
      } else if (error.errMsg.includes('service not found')) {
        errorTitle = '服务异常';
        errorMessage = '打印机服务异常，请检查打印机型号是否支持';
      } else if (error.errMsg.includes('write fail')) {
        errorTitle = '数据传输失败';
        errorMessage = '无法向打印机发送数据，请重试';
      } else {
        errorMessage = error.errMsg;
      }
    } else if (error.message) {
      if (error.message.includes('未找到可写入的蓝牙特征值')) {
        errorTitle = '打印机不兼容';
        errorMessage = '该打印机可能不支持当前打印协议，请联系技术支持';
      } else {
        errorMessage = error.message;
      }
    }
    
    uni.showModal({
      title: errorTitle,
      content: errorMessage,
      showCancel: false
    });
    
    // 尝试关闭可能的蓝牙连接
    try {
      await uni.closeBLEConnection({
        deviceId: printer.deviceId
      });
    } catch (closeError) {
      console.warn('清理蓝牙连接失败:', closeError);
    }
  }
}

// 执行打印
async function executePrint(deviceId, serviceId, characteristicId) {
  let command = new jpPrinter();
  command.setSize(60, 40);
  command.setGap(2);
  command.setCls();
  // command.setText(10, 10, "TSS24.BF2", 2, 2, "店铺:小世界");
  // command.setText(10, 60, "TSS24.BF2", 2, 2, "名称:小boss");
  // command.setText(10, 110, "TSS24.BF2", 2, 2, "地址:地球");
  // command.setText(10, 160, "TSS24.BF2", 2, 2, "联系方式:110");
  command.setText(10, 10, "TSS24.BF2", 1, 1, "测试");  // 正常大小
  command.setText(10, 50, "TSS24.BF2", 2, 1, "测试");  // 2倍宽，正常高
  command.setText(10, 90, "TSS24.BF2", 1, 2, "测试");  // 正常宽，2倍高  
  command.setText(10, 130, "TSS24.BF2", 2, 2, "测试"); // 2倍宽，2倍高

  // command.setQR(50, 300, "L", 5, "A", "Hello world!");
  command.setPagePrint();
  
  await sendBluetoothData(deviceId, serviceId, characteristicId, command.getData());
}

// 发送蓝牙数据
async function sendBluetoothData(deviceId, serviceId, characteristicId, uint8Array) {
  let uint8Buf = Array.from(uint8Array);
  
  function splitArray(datas, size) {
    let result = {};
    let j = 0;
    for (let i = 0; i < datas.length; i += size) {
      result[j] = datas.slice(i, i + size);
      j++;
    }
    return result;
  }
  
  let sendloop = splitArray(uint8Buf, 20);
  
  async function realWriteData(sendloop, i) {
    let data = sendloop[i];
    if (typeof(data) == "undefined") {
      return;
    }
    
    let buffer = new ArrayBuffer(data.length);
    let dataView = new DataView(buffer);
    for (let j = 0; j < data.length; j++) {
      dataView.setUint8(j, data[j]);
    }
    
    await uni.writeBLECharacteristicValue({
      deviceId,
      serviceId,
      characteristicId,
      value: buffer
    });
    
    await realWriteData(sendloop, i + 1);
  }
  
  await realWriteData(sendloop, 0);
}
</script>

<style>
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0;
}

.header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 80rpx 40rpx 60rpx;
  text-align: center;
}

.logo-section {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.logo {
  font-size: 60rpx;
  margin-right: 20rpx;
}

.app-name {
  font-size: 42rpx;
  font-weight: bold;
  color: white;
}

.welcome-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

.main-section {
  padding: 60rpx 40rpx;
  flex: 1;
}

.feature-card {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 60rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
}

.feature-icon {
  font-size: 60rpx;
  margin-right: 30rpx;
}

.feature-info {
  flex: 1;
}

.feature-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.feature-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}

.action-section {
  margin-bottom: 60rpx;
}

.print-button {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border: none;
  border-radius: 60rpx;
  padding: 0;
  width: 100%;
  box-shadow: 0 15rpx 35rpx rgba(79, 172, 254, 0.3);
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx;
}

.btn-icon {
  font-size: 36rpx;
  margin-right: 15rpx;
}

.btn-text {
  font-size: 34rpx;
  font-weight: bold;
  color: white;
}

.status-info {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16rpx;
  padding: 30rpx;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-size: 28rpx;
  color: #666;
}

.status-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #4facfe;
}


</style>