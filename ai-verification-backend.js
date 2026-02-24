#!/usr/bin/env node

/**
 * OpenClaw Guide AI支付截图审核后端
 * 
 * 功能：接收支付截图，使用AI分析是否包含有效的¥9.9支付信息
 * 使用：可以作为后端API，也可以由前端调用
 */

const fs = require('fs');
const path = require('path');

class AIPaymentVerifier {
    constructor() {
        this.verificationLog = [];
        this.approvedUsers = new Set();
    }

    /**
     * 模拟AI分析支付截图
     * @param {string} imagePath - 图片文件路径
     * @param {string} imageDataUrl - Base64图片数据
     * @returns {Promise<Object>} 审核结果
     */
    async verifyPaymentScreenshot(imagePath, imageDataUrl) {
        console.log(`🤖 AI开始分析支付截图: ${imagePath || 'Base64数据'}`);
        
        // 模拟AI处理时间
        await this.sleep(1000);
        
        // 在实际系统中，这里应该：
        // 1. 使用OCR技术识别图片中的文字
        // 2. 检查是否包含关键词：9.9、支付宝、支付成功、¥9.9等
        // 3. 分析图片中的金额信息
        // 4. 验证支付时间
        
        // 模拟OCR识别结果
        const mockOCRText = this.generateMockOCRText();
        
        // 分析关键词
        const analysis = this.analyzeText(mockOCRText);
        
        // 生成审核结果
        const result = {
            approved: analysis.isValid,
            confidence: analysis.confidence,
            ocrText: mockOCRText,
            analysis: analysis,
            timestamp: new Date().toISOString(),
            verificationId: this.generateVerificationId()
        };
        
        // 记录审核日志
        this.verificationLog.push(result);
        
        if (result.approved) {
            console.log(`✅ AI审核通过: ${result.verificationId}`);
            this.approvedUsers.add(result.verificationId);
        } else {
            console.log(`❌ AI审核未通过: ${result.verificationId}`);
        }
        
        return result;
    }
    
    /**
     * 生成模拟OCR文本（模拟支付宝支付截图内容）
     */
    generateMockOCRText() {
        const templates = [
            "支付宝 支付成功 金额: ¥9.9 时间: 2026-02-24 20:45:30 商户: OpenClaw Guide",
            "支付宝支付 ¥9.90 付款成功 交易时间: 刚刚",
            "账单详情 金额: 9.9元 状态: 支付成功 支付宝",
            "付款给 OpenClaw Guide 金额: ¥9.9 时间: 今天 20:45",
            "支付宝 转账 金额: 9.9 收款方: OpenClaw Guide 状态: 成功"
        ];
        
        // 90%的概率返回有效支付信息，10%返回无效信息
        if (Math.random() > 0.1) {
            return templates[Math.floor(Math.random() * templates.length)];
        } else {
            // 无效支付信息
            const invalidTemplates = [
                "支付宝 支付失败 金额: ¥0.00",
                "账单详情 金额: 1.0元 状态: 待支付",
                "截图不清晰，无法识别",
                "微信支付 金额: ¥9.9", // 错误支付平台
                "支付宝 金额: ¥99.0" // 错误金额
            ];
            return invalidTemplates[Math.floor(Math.random() * invalidTemplates.length)];
        }
    }
    
    /**
     * 分析文本内容
     */
    analyzeText(text) {
        const keywords = {
            positive: ['9.9', '¥9.9', '支付宝', '支付成功', '付款成功', '转账成功'],
            negative: ['支付失败', '待支付', '微信', '0.00', '金额错误']
        };
        
        let score = 0;
        let matchedKeywords = [];
        
        // 检查正面关键词
        keywords.positive.forEach(keyword => {
            if (text.includes(keyword)) {
                score += 1;
                matchedKeywords.push(keyword);
            }
        });
        
        // 检查负面关键词
        keywords.negative.forEach(keyword => {
            if (text.includes(keyword)) {
                score -= 2;
                matchedKeywords.push(`[负]${keyword}`);
            }
        });
        
        // 检查金额格式
        const amountRegex = /(¥?\s*9\.9|9\.9\s*元|九点九)/i;
        const hasCorrectAmount = amountRegex.test(text);
        
        // 检查支付宝关键词
        const hasAlipay = text.includes('支付宝');
        
        // 检查成功状态
        const hasSuccess = text.includes('成功') || text.includes('完成');
        
        // 计算置信度
        let confidence = 0;
        if (hasCorrectAmount && hasAlipay && hasSuccess) {
            confidence = 0.95;
        } else if (hasCorrectAmount && hasAlipay) {
            confidence = 0.8;
        } else if (hasCorrectAmount) {
            confidence = 0.6;
        } else {
            confidence = 0.3;
        }
        
        // 添加随机波动
        confidence += (Math.random() - 0.5) * 0.1;
        confidence = Math.max(0.1, Math.min(0.99, confidence));
        
        const isValid = confidence > 0.7 && score > 0;
        
        return {
            isValid,
            confidence: parseFloat(confidence.toFixed(2)),
            score,
            matchedKeywords,
            hasCorrectAmount,
            hasAlipay,
            hasSuccess
        };
    }
    
    /**
     * 生成验证ID
     */
    generateVerificationId() {
        return 'VER-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    /**
     * 睡眠函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 获取审核统计
     */
    getStatistics() {
        const total = this.verificationLog.length;
        const approved = this.verificationLog.filter(r => r.approved).length;
        const rejected = total - approved;
        
        return {
            total,
            approved,
            rejected,
            approvalRate: total > 0 ? (approved / total * 100).toFixed(1) + '%' : '0%',
            last24Hours: this.verificationLog.filter(r => {
                const time = new Date(r.timestamp);
                const now = new Date();
                return (now - time) < 24 * 60 * 60 * 1000;
            }).length
        };
    }
    
    /**
     * 导出审核日志
     */
    exportLog() {
        return {
            timestamp: new Date().toISOString(),
            statistics: this.getStatistics(),
            recentVerifications: this.verificationLog.slice(-10),
            approvedUsers: Array.from(this.approvedUsers)
        };
    }
}

// 如果直接运行此文件，启动测试服务器
if (require.main === module) {
    const verifier = new AIPaymentVerifier();
    
    console.log('🤖 OpenClaw Guide AI支付截图审核系统');
    console.log('========================================');
    
    // 模拟测试
    async function runTests() {
        console.log('\n运行测试...');
        
        for (let i = 0; i < 5; i++) {
            const result = await verifier.verifyPaymentScreenshot(
                `test-screenshot-${i}.png`,
                'data:image/png;base64,...'
            );
            
            console.log(`测试 ${i + 1}: ${result.approved ? '✅ 通过' : '❌ 未通过'} (置信度: ${result.confidence})`);
            console.log(`  OCR文本: ${result.ocrText.substring(0, 50)}...`);
        }
        
        console.log('\n📊 审核统计:');
        console.log(verifier.getStatistics());
        
        console.log('\n📝 导出日志:');
        console.log(JSON.stringify(verifier.exportLog(), null, 2));
    }
    
    runTests().catch(console.error);
}

module.exports = AIPaymentVerifier;