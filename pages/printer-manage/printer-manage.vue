<template>
	<view class="container">
		<view class="header">
			<text class="title">打印机管理</text>
			<button @click="addPrinter" class="add-btn">+ 添加</button>
		</view>
		
		<view class="printer-list">
			<view v-if="printers.length === 0" class="empty-state">
				<view class="empty-icon">🖨️</view>
				<text class="empty-text">暂无打印机</text>
				<text class="empty-hint">点击右上角"添加"按钮添加打印机</text>
			</view>
			
			<view v-for="(printer, index) in printers" :key="index" class="printer-card">
				<view class="printer-info">
					<view class="printer-header">
						<text class="printer-name">{{ printer.name }}</text>
						<view :class="['status-badge', printer.connected ? 'connected' : 'disconnected']">
							{{ printer.connected ? '已连接' : '未连接' }}
						</view>
					</view>
					<text class="printer-id">设备ID: {{ printer.deviceId }}</text>
					<text class="printer-time">添加时间: {{ printer.addTime }}</text>
				</view>
				
				<view class="printer-actions">
					<button @click="testPrinter(printer)" class="test-btn">测试</button>
					<button @click="setDefaultPrinter(index)" 
							:class="['default-btn', printer.isDefault ? 'active' : '']">
						{{ printer.isDefault ? '默认' : '设为默认' }}
					</button>
					<button @click="deletePrinter(index)" class="delete-btn">删除</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const printers = ref([]);

onMounted(() => {
	loadPrinters();
});

// 加载打印机列表
function loadPrinters() {
	try {
		const saved = uni.getStorageSync('savedPrinters');
		if (saved) {
			printers.value = saved;
		}
	} catch (error) {
		console.error('加载打印机列表失败:', error);
	}
}

// 添加打印机
function addPrinter() {
	uni.navigateTo({
		url: '/pages/bluetooth-search/bluetooth-search'
	});
}

// 测试打印机
async function testPrinter(printer) {
	try {
		uni.showLoading({
			title: '正在测试连接...'
		});
		
		// 尝试连接打印机
		await uni.createBLEConnection({ 
			deviceId: printer.deviceId 
		});
		
		uni.hideLoading();
		uni.showToast({
			title: '连接成功',
			icon: 'success'
		});
		
		// 更新连接状态
		printer.connected = true;
		savePrinters();
		
	} catch (error) {
		uni.hideLoading();
		console.error('连接失败:', error);
		
		// 更新连接状态
		printer.connected = false;
		savePrinters();
		
		uni.showModal({
			title: '连接失败',
			content: `无法连接到打印机: ${error.errMsg || '未知错误'}`,
			showCancel: false
		});
	}
}

// 删除打印机
function deletePrinter(index) {
	uni.showModal({
		title: '确认删除',
		content: '确定要删除这台打印机吗？',
		success: (res) => {
			if (res.confirm) {
				printers.value.splice(index, 1);
				savePrinters();
				uni.showToast({
					title: '删除成功',
					icon: 'success'
				});
			}
		}
	});
}

// 设置默认打印机
function setDefaultPrinter(index) {
	// 清除所有打印机的默认状态
	printers.value.forEach(printer => {
		printer.isDefault = false;
	});
	
	// 设置选中的打印机为默认
	printers.value[index].isDefault = true;
	
	// 保存到本地存储
	savePrinters();
	
	uni.showToast({
		title: '设置成功',
		icon: 'success'
	});
}

// 保存打印机列表
function savePrinters() {
	try {
		uni.setStorageSync('savedPrinters', printers.value);
	} catch (error) {
		console.error('保存打印机列表失败:', error);
	}
}
</script>

<style>
.container {
	min-height: 100vh;
	background-color: #f5f5f5;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 30rpx 40rpx;
	background-color: white;
	border-bottom: 2rpx solid #f0f0f0;
}

.title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
}

.add-btn {
	padding: 16rpx 32rpx;
	background-color: #007aff;
	color: white;
	border: none;
	border-radius: 20rpx;
	font-size: 28rpx;
}

.printer-list {
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

.printer-card {
	background-color: white;
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}

.printer-info {
	margin-bottom: 30rpx;
}

.printer-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.printer-name {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.status-badge {
	padding: 8rpx 16rpx;
	border-radius: 12rpx;
	font-size: 24rpx;
	color: white;
}

.status-badge.connected {
	background-color: #28a745;
}

.status-badge.disconnected {
	background-color: #dc3545;
}

.printer-id {
	display: block;
	font-size: 26rpx;
	color: #666;
	margin-bottom: 10rpx;
}

.printer-time {
	display: block;
	font-size: 26rpx;
	color: #999;
}

.printer-actions {
	display: flex;
	gap: 20rpx;
}

.test-btn {
	flex: 1;
	height: 70rpx;
	background-color: #28a745;
	color: white;
	border: none;
	border-radius: 8rpx;
	font-size: 28rpx;
}

.default-btn {
	flex: 1;
	height: 70rpx;
	background-color: #6c757d;
	color: white;
	border: none;
	border-radius: 8rpx;
	font-size: 28rpx;
}

.default-btn.active {
	background-color: #007aff;
}

.delete-btn {
	flex: 1;
	height: 70rpx;
	background-color: #dc3545;
	color: white;
	border: none;
	border-radius: 8rpx;
	font-size: 28rpx;
}
</style>