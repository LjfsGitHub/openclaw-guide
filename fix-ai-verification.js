// 修复AI审核中心页面的脚本
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ai-verification-center.html');
let content = fs.readFileSync(filePath, 'utf8');

// 查找并替换成功消息部分
const searchText = `                        <p style="color: var(--apple-blue); font-weight: 600;">
                            🚀 3秒后自动跳转到下载页面...
                        </p>
                        <div style="width: 100%; height: 4px; background: rgba(0, 122, 255, 0.2); border-radius: var(--radius-full); margin-top: var(--space-2); overflow: hidden;">
                            <div id="countdownBar" style="width: 0%; height: 100%; background: var(--apple-blue); transition: width 3s linear;"></div>
                        </div>`;

const replaceText = `                        <p style="color: var(--apple-blue); font-weight: 600;">
                            🚀 3秒后自动跳转到下载页面...
                        </p>
                        <div style="width: 100%; height: 4px; background: rgba(0, 122, 255, 0.2); border-radius: var(--radius-full); margin-top: var(--space-2); overflow: hidden;">
                            <div id="countdownBar" style="width: 0%; height: 100%; background: var(--apple-blue); transition: width 3s linear;"></div>
                        </div>
                        <div class="mt-4">
                            <a href="/openclaw-guide/file-download.html" class="btn btn-primary" style="width: 100%;">
                                ✅ 点击立即进入下载中心
                            </a>
                            <p class="text-tertiary mt-2" style="font-size: var(--font-size-sm);">
                                如果3秒后没有自动跳转，请点击上方按钮
                            </p>
                        </div>`;

if (content.includes(searchText)) {
    content = content.replace(searchText, replaceText);
    fs.writeFileSync(filePath, content);
    console.log('✅ 成功添加手动跳转按钮');
} else {
    console.log('❌ 未找到目标文本，可能页面结构已变化');
    
    // 尝试另一种方式：在AI结果div后添加手动按钮
    const aiResultClose = `                </div>
            </div>`;
    
    if (content.includes(aiResultClose)) {
        const manualButton = `
                <div class="mt-4 text-center">
                    <a href="/openclaw-guide/file-download.html" class="btn btn-primary btn-lg">
                        ✅ 点击立即进入下载中心
                    </a>
                    <p class="text-tertiary mt-2" style="font-size: var(--font-size-sm);">
                        如果自动跳转失败，请点击上方按钮手动进入
                    </p>
                </div>
            </div>
            </div>`;
        
        content = content.replace(aiResultClose, manualButton);
        fs.writeFileSync(filePath, content);
        console.log('✅ 添加手动跳转按钮（备用方式）');
    }
}