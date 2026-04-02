/**
 * addClickOrTouch — 兼容 PC 和手机的点击事件注册
 * 
 * 手机浏览器上 click 事件可能有 300ms 延迟或不触发，
 * 此工具函数同时注册 click + touchend，并防止重复触发。
 * 
 * Unity equivalent: EventTrigger 同时支持 Pointer 和 Touch
 * 
 * @param {HTMLElement} element - 目标元素（通常是 canvas）
 * @param {Function} handler - 点击处理函数，接收 {x, y} 参数（canvas 坐标）
 * @returns {Function} cleanup - 调用以移除所有监听器
 */
export function addClickOrTouch(element, handler) {
    let touchHandled = false;

    const onClick = (e) => {
        // 如果刚处理过 touch，跳过随后的 click（防重复）
        if (touchHandled) {
            touchHandled = false;
            return;
        }
        const rect = element.getBoundingClientRect();
        handler({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const onTouchEnd = (e) => {
        e.preventDefault();
        touchHandled = true;
        // 300ms 后重置（如果 click 没来）
        setTimeout(() => { touchHandled = false; }, 400);

        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const rect = element.getBoundingClientRect();
            handler({
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            });
        }
    };

    element.addEventListener('click', onClick);
    element.addEventListener('touchend', onTouchEnd, { passive: false });

    // 返回清理函数
    return function cleanup() {
        element.removeEventListener('click', onClick);
        element.removeEventListener('touchend', onTouchEnd);
    };
}
