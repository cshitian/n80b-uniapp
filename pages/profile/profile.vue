<template>
	<view class="container">
		<view class="menu-section">
			<view class="menu-item" @click="goToPrinterManage">
				<view class="menu-icon">🖨️</view>
				<view class="menu-content">
					<text class="menu-title">打印机管理</text>
					<text class="menu-desc">添加和管理蓝牙打印机</text>
				</view>
			</view>
		</view>
		
		<view class="info-section">
			<view class="info-item">
				<text class="info-label">版本号</text>
				<text class="info-value">1.0.0</text>
			</view>
			<view class="info-item">
				<text class="info-label">关于</text>
				<text class="info-value">蓝牙打印助手</text>
			</view>
		</view>
	</view>
</template>

<script setup>
// 跳转到打印机管理页面
function goToPrinterManage() {
	uni.navigateTo({
		url: '/pages/printer-manage/printer-manage'
	});
}
</script>

<style>
.container {
	min-height: 100vh;
	background-color: #f5f5f5;
	padding-top: 40rpx;
}

.menu-section {
	margin: 30rpx;
	background-color: white;
	border-radius: 16rpx;
	overflow: hidden;
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 40rpx 30rpx;
	border-bottom: 2rpx solid #f0f0f0;
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-item:active {
	background-color: #f8f9fa;
}

.menu-icon {
	width: 80rpx;
	height: 80rpx;
	background-color: #f0f0f0;
	border-radius: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 40rpx;
	margin-right: 30rpx;
}

.menu-content {
	flex: 1;
}

.menu-title {
	display: block;
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 8rpx;
}

.menu-desc {
	display: block;
	font-size: 26rpx;
	color: #666;
}

.menu-arrow {
	font-size: 32rpx;
	color: #ccc;
}

.info-section {
	margin: 30rpx;
	background-color: white;
	border-radius: 16rpx;
	overflow: hidden;
}

.info-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 30rpx;
	border-bottom: 2rpx solid #f0f0f0;
}

.info-item:last-child {
	border-bottom: none;
}

.info-label {
	font-size: 30rpx;
	color: #333;
}

.info-value {
	font-size: 30rpx;
	color: #666;
}
</style>