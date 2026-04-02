# -*- coding: utf-8 -*-
"""P0 - 引擎核心 ECS 架构图"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import os

plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei']
plt.rcParams['axes.unicode_minus'] = False
OUT = os.path.join(os.path.dirname(__file__), 'P0-引擎核心')
os.makedirs(OUT, exist_ok=True)

def box(ax, x, y, w, h, txt, c='#3498db', tc='white', fs=11):
    p = FancyBboxPatch((x,y), w, h,
        boxstyle="round,pad=0,rounding_size=0.12",
        fc=c, ec='#2c3e50', lw=1.5)
    ax.add_patch(p)
    ax.text(x+w/2, y+h/2, txt, ha='center', va='center',
            fontsize=fs, color=tc, fontweight='bold')

def arrow(ax, x1, y1, x2, y2, txt='', c='#2c3e50'):
    ax.annotate('', xy=(x2,y2), xytext=(x1,y1),
        arrowprops=dict(arrowstyle='->', color=c, lw=1.5))
    if txt:
        ax.text((x1+x2)/2, (y1+y2)/2+0.12, txt,
                ha='center', fontsize=8, color='#7f8c8d', style='italic')

# === 图1: ECS 架构总览 ===
fig, ax = plt.subplots(1, 1, figsize=(14, 9))
ax.set_xlim(0, 14); ax.set_ylim(0, 9)
ax.axis('off')
ax.set_title('P0 — ECS 引擎核心架构', fontsize=18, fontweight='bold', pad=15)

# Game Loop (顶部)
box(ax, 5.5, 7.8, 3, 0.8, 'Game Loop\n(requestAnimationFrame)', '#e74c3c', fs=10)

# 三大管理器
box(ax, 0.5, 5.8, 3, 0.8, 'EntityManager\n实体管理', '#2ecc71')
box(ax, 5.5, 5.8, 3, 0.8, 'SystemManager\n系统管理', '#3498db')
box(ax, 10.5, 5.8, 3, 0.8, 'SceneManager\n场景管理', '#9b59b6')

# 箭头: Loop -> 管理器
arrow(ax, 7, 7.8, 2, 6.6, 'update(dt)')
arrow(ax, 7, 7.8, 7, 6.6, 'update(dt)')
arrow(ax, 7, 7.8, 12, 6.6, 'switchScene()')

# Entity 层
box(ax, 0.2, 3.8, 1.5, 0.7, 'Entity', '#1abc9c', fs=9)
box(ax, 1.9, 3.8, 1.5, 0.7, 'Entity', '#1abc9c', fs=9)
box(ax, 3.6, 3.8, 1.5, 0.7, 'Entity', '#1abc9c', fs=9)

# Component 层
box(ax, 0.2, 2.5, 1.8, 0.7, 'Transform\nComp', '#f39c12', tc='#2c3e50', fs=8)
box(ax, 2.2, 2.5, 1.8, 0.7, 'Health\nComp', '#f39c12', tc='#2c3e50', fs=8)
box(ax, 4.2, 2.5, 1.8, 0.7, 'Sprite\nComp', '#f39c12', tc='#2c3e50', fs=8)
box(ax, 6.2, 2.5, 1.8, 0.7, 'Combat\nComp', '#f39c12', tc='#2c3e50', fs=8)
box(ax, 8.2, 2.5, 1.8, 0.7, 'AI\nComp', '#f39c12', tc='#2c3e50', fs=8)

# System 层
box(ax, 5.5, 3.8, 2, 0.7, 'Movement\nSystem', '#2980b9', fs=9)
box(ax, 7.7, 3.8, 2, 0.7, 'Render\nSystem', '#2980b9', fs=9)
box(ax, 9.9, 3.8, 2, 0.7, 'Combat\nSystem', '#2980b9', fs=9)
box(ax, 12.1, 3.8, 1.7, 0.7, 'AI\nSystem', '#2980b9', fs=9)

# 箭头: 管理器 -> 下层
arrow(ax, 2, 5.8, 2, 4.5)
arrow(ax, 7, 5.8, 7, 4.5)

# Scene 层
box(ax, 10.2, 4.8, 3.5, 0.7, 'GameScene / LobbyScene\n/ CharSelectScene', '#8e44ad', fs=8)
arrow(ax, 12, 5.8, 12, 5.5)

# 底部: 数据层
box(ax, 1, 1.0, 3, 0.7, 'AssetManager\n资源加载(JSON/PNG/Audio)', '#34495e', fs=8)
box(ax, 5, 1.0, 3, 0.7, 'EventSystem\n全局事件总线', '#34495e', fs=8)
box(ax, 9, 1.0, 3, 0.7, 'Camera\n视口跟随 + 裁剪', '#34495e', fs=8)

# 标注区域
ax.add_patch(plt.Rectangle((0,2.2), 10.3, 1.2, fill=False,
             ec='#e67e22', ls='--', lw=1.2))
ax.text(0.1, 3.25, '组件层 (纯数据)', fontsize=8, color='#e67e22')

ax.add_patch(plt.Rectangle((5.3,3.6), 8.7, 1.1, fill=False,
             ec='#2980b9', ls='--', lw=1.2))
ax.text(5.4, 4.55, '系统层 (纯逻辑)', fontsize=8, color='#2980b9')

fig.savefig(os.path.join(OUT, 'ECS架构总览.png'), dpi=150,
            bbox_inches='tight', facecolor='white')
plt.close(fig)
print("[OK] P0-引擎核心/ECS架构总览.png")

# === 图2: Game Loop 时序 ===
fig2, ax2 = plt.subplots(1, 1, figsize=(12, 7))
ax2.set_xlim(0, 12); ax2.set_ylim(0, 7)
ax2.axis('off')
ax2.set_title('P0 — Game Loop 每帧执行流程', fontsize=16, fontweight='bold', pad=15)

steps = [
    ('requestAnimation\nFrame', '#e74c3c'),
    ('计算 deltaTime', '#e67e22'),
    ('Input 采集\n(键盘/触控)', '#f1c40f'),
    ('System.update(dt)\n按优先级执行', '#2ecc71'),
    ('Physics 碰撞\n检测 & 推开', '#1abc9c'),
    ('Combat 伤害\n结算', '#3498db'),
    ('Render 绘制\n(Camera 裁剪)', '#9b59b6'),
    ('清理死亡实体\nGC', '#34495e'),
]
bw, bh = 2.5, 0.8
sx = 0.5
for i, (txt, c) in enumerate(steps):
    row = i // 4
    col = i % 4
    x = sx + col * 2.9
    y = 5.5 - row * 2.5
    tc = '#2c3e50' if c == '#f1c40f' else 'white'
    box(ax2, x, y, bw, bh, txt, c, tc=tc, fs=9)
    if i < len(steps) - 1:
        nr, nc = (i+1)//4, (i+1)%4
        nx = sx + nc * 2.9
        ny = 5.5 - nr * 2.5
        if nr == row:
            arrow(ax2, x+bw, y+bh/2, nx, ny+bh/2)
        else:
            # 换行
            arrow(ax2, x+bw/2, y, nx+bw/2, ny+bh)

# 循环箭头标注
ax2.annotate('', xy=(sx+bw/2, 5.5+bh+0.15),
    xytext=(sx+3*2.9+bw/2, 3.0),
    arrowprops=dict(arrowstyle='->', color='#e74c3c',
                    lw=2, ls='--',
                    connectionstyle='arc3,rad=0.5'))
ax2.text(11.5, 5.0, '循环', fontsize=10, color='#e74c3c', fontweight='bold')

fig2.savefig(os.path.join(OUT, 'GameLoop流程.png'), dpi=150,
             bbox_inches='tight', facecolor='white')
plt.close(fig2)
print("[OK] P0-引擎核心/GameLoop流程.png")
