<template>
	<view class="container">
		<view class="search-section">
			<button @click="startSearch" :disabled="isSearching" class="search-btn">
				{{ isSearching ? '搜索中...' : '开始搜索' }}
			</button>
			<view v-if="isSearching" class="search-tip">
				<text>正在搜索蓝牙设备，请确保打印机已开启...</text>
			</view>
		</view>
		
		<view class="device-list">
			<view v-if="devices.length === 0 && !isSearching" class="empty-state">
				<view class="empty-icon">📡</view>
				<text class="empty-text">暂未发现设备</text>
				<text class="empty-hint">点击"开始搜索"查找附近的蓝牙打印机</text>
			</view>
			
			<view v-for="(device, index) in devices" :key="index" class="device-item">
				<view class="device-info">
					<text class="device-name">{{ device.name || '未知设备' }}</text>
					<text class="device-id">{{ device.deviceId }}</text>
					<text class="device-rssi">信号强度: {{ device.RSSI }}dBm</text>
				</view>
				<button @click="connectDevice(device)" :disabled="connecting" class="connect-btn">
					{{ connecting && selectedDevice?.deviceId === device.deviceId ? '连接中...' : '连接' }}
				</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const devices = ref([]);
const isSearching = ref(false);
const connecting = ref(false);
const selectedDevice = ref(null);

onMounted(() => {
	// 页面加载时自动开始搜索
	startSearch();
});

onUnmounted(() => {
	// 页面卸载时停止搜索
	stopSearch();
});

// 开始搜索
async function startSearch() {
	if (isSearching.value) return;
	
	devices.value = [];
	isSearching.value = true;
	
	try {
		// 打开蓝牙适配器
		await uni.openBluetoothAdapter();
		
		// 设置设备发现监听
		uni.onBluetoothDeviceFound((res) => {
			res.devices.forEach((device) => {
				// 过滤掉没有名称的设备和重复设备
				if (device.name && !devices.value.find(d => d.deviceId === device.deviceId)) {
					devices.value.push({
						name: device.name,
						deviceId: device.deviceId,
						RSSI: device.RSSI || -100
					});
				}
			});
		});
		
		// 开始搜索设备
		await uni.startBluetoothDevicesDiscovery({
			allowDuplicatesKey: false
		});
		
		// 10秒后自动停止搜索
		setTimeout(() => {
			stopSearch();
		}, 10000);
		
	} catch (error) {
		isSearching.value = false;
		console.error('搜索失败:', error);
		
		if (error.errCode === 10001) {
			uni.showModal({
				title: '蓝牙未开启',
				content: '请先开启手机蓝牙功能，然后重试',
				showCancel: false
			});
		} else {
			uni.showModal({
				title: '搜索失败',
				content: `错误信息: ${error.errMsg || '未知错误'}`,
				showCancel: false
			});
		}
	}
}

// 停止搜索
async function stopSearch() {
	if (!isSearching.value) return;
	
	try {
		await uni.stopBluetoothDevicesDiscovery();
		isSearching.value = false;
		
		if (devices.value.length > 0) {
			uni.showToast({
				title: `发现 ${devices.value.length} 个设备`,
				icon: 'success'
			});
		}
	} catch (error) {
		console.error('停止搜索失败:', error);
		isSearching.value = false;
	}
}

// 连接设备
async function connectDevice(device) {
	if (connecting.value) return;
	
	connecting.value = true;
	selectedDevice.value = device;
	
	try {
		uni.showLoading({
			title: '正在连接...'
		});
		
		// 停止搜索
		await stopSearch();
		
		// 创建蓝牙连接
		await uni.createBLEConnection({
			deviceId: device.deviceId
		});
		
		// 获取服务
		const services = await uni.getBLEDeviceServices({
			deviceId: device.deviceId
		});
		
		// 查找可写入的特征值
		let writeService = null;
		let writeCharacteristic = null;
		
		for (const service of services.services) {
			const characteristics = await uni.getBLEDeviceCharacteristics({
				deviceId: device.deviceId,
				serviceId: service.uuid
			});
			
			for (const characteristic of characteristics.characteristics) {
				if (characteristic.properties.write) {
					writeService = service.uuid;
					writeCharacteristic = characteristic.uuid;
					break;
				}
			}
			if (writeService) break;
		}
		
		if (!writeService || !writeCharacteristic) {
			throw new Error('未找到可写入的蓝牙特征值');
		}
		
		// 保存打印机到本地存储
		const printerData = {
			name: device.name,
			deviceId: device.deviceId,
			serviceId: writeService,
			characteristicId: writeCharacteristic,
			connected: true,
			addTime: new Date().toLocaleString()
		};
		
		// 获取已保存的打印机列表
		let savedPrinters = [];
		try {
			const saved = uni.getStorageSync('savedPrinters');
			if (saved) {
				savedPrinters = saved;
			}
		} catch (error) {
			console.error('读取打印机列表失败:', error);
		}
		
		// 检查是否已存在
		const existingIndex = savedPrinters.findIndex(p => p.deviceId === device.deviceId);
		if (existingIndex >= 0) {
			// 更新现有打印机
			savedPrinters[existingIndex] = printerData;
		} else {
			// 添加新打印机
			savedPrinters.push(printerData);
		}
		
		// 保存到本地存储
		uni.setStorageSync('savedPrinters', savedPrinters);
		
		uni.hideLoading();
		uni.showToast({
			title: '连接成功',
			icon: 'success'
		});
		
		// 延迟返回上一页
		setTimeout(() => {
			uni.navigateBack();
		}, 1500);
		
	} catch (error) {
		connecting.value = false;
		selectedDevice.value = null;
		uni.hideLoading();
		
		console.error('连接失败:', error);
		uni.showModal({
			title: '连接失败',
			content: `无法连接到设备: ${error.errMsg || error.message || '未知错误'}`,
			showCancel: false
		});
	}
}
</script>

<style>
.container {
	min-height: 100vh;
	background-color: #f5f5f5;
}

.search-section {
	padding: 40rpx;
	background-color: white;
	border-bottom: 2rpx solid #f0f0f0;
}

.search-btn {
	width: 100%;
	height: 80rpx;
	background-color: #007aff;
	color: white;
	border: none;
	border-radius: 12rpx;
	font-size: 32rpx;
	margin-bottom: 20rpx;
}

.search-btn:disabled {
	background-color: #ccc;
}

.search-tip {
	text-align: center;
	padding: 20rpx;
	background-color: #f0f8ff;
	border-radius: 8rpx;
	border-left: 6rpx solid #007aff;
}

.search-tip text {
	font-size: 28rpx;
	color: #007aff;
}

.device-list {
	padding: 30rpx;
}

.empty-state {
	text-align: center;
	padding: 120rpx 40rpx;
}

.empty-icon {
	font-size: 120rpx;
	margin-bottom: 30rpx;
	opacity: 0.3;
}

.empty-text {
	display: block;
	font-size: 32rpx;
	color: #999;
	margin-bottom: 20rpx;
}

.empty-hint {
	display: block;
	font-size: 28rpx;
	color: #ccc;
}

.device-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background-color: white;
	padding: 30rpx;
	margin-bottom: 20rpx;
	border-radius: 12rpx;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}

.device-info {
	flex: 1;
	margin-right: 20rpx;
}

.device-name {
	display: block;
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 10rpx;
}

.device-id {
	display: block;
	font-size: 24rpx;
	color: #666;
	margin-bottom: 8rpx;
}

.device-rssi {
	display: block;
	font-size: 24rpx;
	color: #999;
}

.connect-btn {
	width: 120rpx;
	height: 60rpx;
	background-color: #28a745;
	color: white;
	border: none;
	border-radius: 8rpx;
	font-size: 28rpx;
}

.connect-btn:disabled {
	background-color: #ccc;
}
</style>