// 在 KM 文章页面打开浏览器 F12 控制台，粘贴执行以下代码：
// 它会自动下载文章中所有图片并按顺序命名

const names = [
  '01_选择Spec_OpenSpec',
  '02_环境未初始化',
  '03_cli安装选择版本',
  '04_初始化成功',
  '05_onboard_welcome',
  '06_onboard_congratulations',
  '07_onboard_whats_next',
  '08_explore_读取project',
  '09_explore_关键问题确认',
  '10_explore_场景澄清',
  '11_explore_进一步思考',
  '12_explore_需求流程图',
  '13_explore_准备就绪',
  '14_new_变更创建完成',
  '15_new_读取project',
  '16_new_proposal完成',
  '17_new_design完成',
  '18_new_specs完成',
  '19_new_tasks完成',
  '20_ff_所有artifacts完成',
  '21_ff_变更创建完成详情',
];

// 获取文章正文中的所有图片
const imgs = document.querySelectorAll('.article-content img, .km-rich-text img, .ne-doc-major-content img');
console.log(`找到 ${imgs.length} 张图片`);

imgs.forEach((img, i) => {
  if (i >= names.length) return;
  const url = img.src;
  console.log(`下载第 ${i+1} 张: ${url.substring(0, 80)}...`);
  fetch(url)
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = names[i] + '.png';
      a.click();
    });
});
