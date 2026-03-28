const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const fs = require('fs');

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "Background Remover - MVP 需求文档",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "项目概述", bold: true, size: 28 }),
                ],
                spacing: { before: 400, after: 200 },
            }),
            new Paragraph({ text: "产品名称: Background Remover" }),
            new Paragraph({ text: "目标用户: 需要快速去除图片背景的用户（电商卖家、设计师、普通用户）" }),
            new Paragraph({ text: "核心价值: 免费、快速、无需注册即可使用的在线背景去除工具" }),
            new Paragraph({ text: "技术栈: 纯前端静态网站 + Remove.bg API" }),
            new Paragraph({ text: "部署平台: Cloudflare Pages（免费）" }),
            
            new Paragraph({
                children: [
                    new TextRun({ text: "核心功能（MVP 阶段）", bold: true, size: 28 }),
                ],
                spacing: { before: 400, after: 200 },
            }),
            new Paragraph({ text: "1. 图片上传", heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: "• 支持点击上传" }),
            new Paragraph({ text: "• 支持拖拽上传" }),
            new Paragraph({ text: "• 文件格式：PNG、JPG、JPEG" }),
            new Paragraph({ text: "• 文件大小限制：10MB" }),
            
            new Paragraph({ text: "2. 背景去除", heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: "• 调用 Remove.bg API 处理图片" }),
            new Paragraph({ text: "• 显示处理进度（Loading 动画）" }),
            new Paragraph({ text: "• 错误处理（API 失败、网络错误等）" }),
            
            new Paragraph({ text: "3. 结果展示", heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: "• 左右对比显示：原图 vs 去背景后" }),
            new Paragraph({ text: "• 响应式布局（移动端自动切换为上下布局）" }),
            
            new Paragraph({ text: "4. 下载功能", heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: "• 一键下载去背景后的 PNG 图片" }),
            new Paragraph({ text: "• 文件名：background-removed.png" }),
            
            new Paragraph({ text: "5. 重新上传", heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: "• 处理完成后可以上传新图片" }),
            new Paragraph({ text: "• 清空之前的结果" }),
        ]
    }]
});

Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync("MVP-Requirements.docx", buffer);
    console.log("Word document created successfully!");
});
