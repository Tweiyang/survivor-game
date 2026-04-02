/**
 * UIScale — UI 自适应缩放工具
 * 
 * 根据 canvas 尺寸计算缩放因子，确保 UI 在各种屏幕上完整显示。
 * 设计基准：960 × 640（PC 浏览器典型尺寸）
 *
 * Unity equivalent: CanvasScaler (Scale With Screen Size)
 */

const BASE_WIDTH = 960;
const BASE_HEIGHT = 640;

/**
 * 获取 UI 缩放因子
 * @param {number} canvasW - 画布宽度
 * @param {number} canvasH - 画布高度
 * @returns {number} 缩放因子（0.4 ~ 1.0）
 */
export function getUIScale(canvasW, canvasH) {
    const scaleX = canvasW / BASE_WIDTH;
    const scaleY = canvasH / BASE_HEIGHT;
    // 取较小值确保内容不超出屏幕
    return Math.min(scaleX, scaleY, 1.0);
}

/**
 * 判断是否为小屏设备（宽度 < 600px）
 */
export function isSmallScreen(canvasW) {
    return canvasW < 600;
}

/**
 * 判断是否为横屏
 */
export function isLandscape(canvasW, canvasH) {
    return canvasW > canvasH;
}
