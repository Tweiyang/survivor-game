# -*- coding: utf-8 -*-
"""P5 - 联机多人系统架构图"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import os

plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei']
plt.rcParams['axes.unicode_minus'] = False
BASE = os.path.dirname(__file__)

def box(ax, x, y, w, h, txt, c='#3498db', tc='white', fs=10):
    p = FancyBboxPatch((x,y), w, h,
        boxstyle="round,pad=0,rounding_size=0.12",
        fc=c, ec='#2c3e50', lw=1.5)
    ax.add_patch(p)
    ax.text(x+w/2, y+h/2, txt, ha='center', va='center',
            fontsize=fs, color=tc, fontweight='bold')

def arr(ax, x1, y1, x2, y2, txt='', c='#2c3e50'):
    ax.annotate('', xy=(x2,y2), xytext=(x1,y1),
        arrowprops=dict(arrowstyle='->', color=c, lw=1.5))
    if txt:
        ax.text((x1+x2)/2, (y1+y2)/2+0.15, txt,
                ha='center', fontsize=8, color='#7f8c8d',
                style='italic')

def save(fig, folder, name):
    d = os.path.join(BASE, folder)
    os.makedirs(d, exist_ok=True)
    fig.savefig(os.path.join(d, name), dpi=150,
                bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"[OK] {folder}/{name}")

# === P5 图1: 服务端权威架构 ===
fig, ax = plt.subplots(figsize=(14, 10))
ax.set_xlim(0, 14); ax.set_ylim(0, 10); ax.axis('off')
ax.set_title('P5 - 服务端权威架构', fontsize=18,
             fontweight='bold', pad=15)

# 客户端A区域
ax.add_patch(plt.Rectangle((0.3, 6.5), 4.2, 3,
             fill=True, fc='#eaf2f8', ec='#3498db',
             lw=1.5, ls='--'))
ax.text(2.4, 9.2, '客户端 A (本机)',
        ha='center', fontsize=11, color='#3498db',
        fontweight='bold')
box(ax, 0.5, 8, 1.8, 0.7, '键盘输入', '#3498db', fs=9)
box(ax, 2.7, 8, 1.6, 0.7, '预测移动', '#5dade2', fs=9)
box(ax, 0.5, 6.8, 1.8, 0.7, '接收状态', '#2ecc71', fs=9)
box(ax, 2.7, 6.8, 1.6, 0.7, '插值渲染', '#27ae60', fs=9)
arr(ax, 2.3, 8.35, 2.7, 8.35)
arr(ax, 2.3, 7.15, 2.7, 7.15)

# 服务端区域(中央)
ax.add_patch(plt.Rectangle((5, 4.5), 4, 5,
             fill=True, fc='#0f3460', ec='#e74c3c',
             lw=2, alpha=0.15))
ax.text(7, 9.2, 'Colyseus Server (权威)',
        ha='center', fontsize=12, color='#e74c3c',
        fontweight='bold')
box(ax, 5.3, 8, 3.4, 0.7, 'BattleRoom', '#e74c3c', fs=10)
box(ax, 5.3, 6.8, 3.4, 0.7, 'ServerCombat\n伤害结算', '#c0392b', fs=9)
box(ax, 5.3, 5.6, 3.4, 0.7, 'ServerSpawner\n怪物生成', '#e67e22', fs=9)
box(ax, 5.3, 4.6, 3.4, 0.7, 'Schema State\n状态广播', '#f39c12', tc='#2c3e50', fs=9)
arr(ax, 7, 8, 7, 7.5)
arr(ax, 7, 6.8, 7, 6.3)
arr(ax, 7, 5.6, 7, 5.3)

# 客户端B区域
ax.add_patch(plt.Rectangle((9.5, 6.5), 4.2, 3,
             fill=True, fc='#eaf2f8', ec='#3498db',
             lw=1.5, ls='--'))
ax.text(11.6, 9.2, '客户端 B (远程)',
        ha='center', fontsize=11, color='#3498db',
        fontweight='bold')
box(ax, 9.7, 8, 1.8, 0.7, '键盘输入', '#3498db', fs=9)
box(ax, 11.9, 8, 1.6, 0.7, '预测移动', '#5dade2', fs=9)
box(ax, 9.7, 6.8, 1.8, 0.7, '接收状态', '#2ecc71', fs=9)
box(ax, 11.9, 6.8, 1.6, 0.7, '插值渲染', '#27ae60', fs=9)
arr(ax, 11.5, 8.35, 11.9, 8.35)
arr(ax, 11.5, 7.15, 11.9, 7.15)

# 通信箭头
arr(ax, 4.3, 8.35, 5.3, 8.35, 'send input')
arr(ax, 5.3, 7.15, 4.3, 7.15, 'state diff')
arr(ax, 8.7, 8.35, 9.7, 8.35, 'state diff')
arr(ax, 9.7, 7.15, 8.7, 7.15, 'send input')

# 底部: 同步子系统
box(ax, 0.5, 2.5, 3, 0.8, 'StateSynchronizer\nonAdd / onRemove', '#9b59b6', fs=9)
box(ax, 4.5, 2.5, 3, 0.8, 'NetworkManager\nWebSocket 单例', '#34495e', fs=9)
box(ax, 8.5, 2.5, 3, 0.8, 'DifficultyScaler\n人数难度缩放', '#1abc9c', fs=9)

# 难度公式
ax.text(7, 1.3, 'multiplier = 1.0 + (playerCount - 1) x 0.5',
        ha='center', fontsize=11, color='#e74c3c',
        fontweight='bold',
        bbox=dict(boxstyle='round', fc='#ffeaa7', ec='#e74c3c'))

save(fig, 'P5-联机多人', '服务端权威架构.png')
print("=== P5 完成 ===")
