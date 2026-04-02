# -*- coding: utf-8 -*-
"""P1 - 战斗系统流程图"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import os

plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei']
plt.rcParams['axes.unicode_minus'] = False
OUT = os.path.join(os.path.dirname(__file__), 'P1-基础战斗')
os.makedirs(OUT, exist_ok=True)

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
        ax.text((x1+x2)/2+0.05, (y1+y2)/2+0.15, txt,
                ha='center', fontsize=8, color='#7f8c8d', style='italic')

# === 攻击伤害流程 ===
fig, ax = plt.subplots(figsize=(14, 8))
ax.set_xlim(0, 14); ax.set_ylim(0, 8); ax.axis('off')
ax.set_title('P1 — 攻击伤害结算流程', fontsize=18, fontweight='bold', pad=15)

# 第一行: 输入 -> 攻击
box(ax, 0.5, 6.5, 2.5, 0.8, '玩家按下\n攻击键', '#e74c3c')
box(ax, 4, 6.5, 2.5, 0.8, 'CombatComp\n触发攻击', '#e67e22')
box(ax, 7.5, 6.5, 2.5, 0.8, '生成投射物\nProjectile', '#f1c40f', tc='#2c3e50')
box(ax, 11, 6.5, 2.5, 0.8, '投射物飞行\n+ 碰撞检测', '#2ecc71')

arr(ax, 3, 6.9, 4, 6.9, '')
arr(ax, 6.5, 6.9, 7.5, 6.9, '')
arr(ax, 10, 6.9, 11, 6.9, '')

# 第二行: 命中判定
box(ax, 1, 4.5, 2.5, 0.8, '碰撞命中?\nAABB检测', '#1abc9c')
box(ax, 5, 4.5, 2.5, 0.8, '计算伤害\nATK × 倍率', '#3498db')
box(ax, 9, 4.5, 2.5, 0.8, '扣血\ncurrentHp -= dmg', '#9b59b6')

arr(ax, 12.25, 6.5, 2.25, 5.3)
arr(ax, 3.5, 4.9, 5, 4.9)
arr(ax, 7.5, 4.9, 9, 4.9)

# 第三行: 结果
box(ax, 0.5, 2.5, 2, 0.8, '受击闪烁\n白色0.1s', '#e74c3c')
box(ax, 3.5, 2.5, 2, 0.8, '飘字伤害\nDamageText', '#e67e22')
box(ax, 6.5, 2.5, 2, 0.8, '击退效果\nknockback', '#f39c12', tc='#2c3e50')
box(ax, 9.5, 2.5, 2, 0.8, 'HP <= 0?\n死亡判定', '#2ecc71')
box(ax, 12, 2.5, 1.8, 0.8, '掉落\n经验球', '#3498db')

arr(ax, 10.25, 4.5, 1.5, 3.3)
arr(ax, 10.25, 4.5, 4.5, 3.3)
arr(ax, 10.25, 4.5, 7.5, 3.3)
arr(ax, 10.25, 4.5, 10.5, 3.3)
arr(ax, 11.5, 2.9, 12, 2.9)

# 底部标注
ax.text(7, 1.3, '单人模式: 客户端直接结算  |  联网模式: 服务端权威结算',
        ha='center', fontsize=11, color='#e74c3c',
        fontweight='bold',
        bbox=dict(boxstyle='round', fc='#ffeaa7', ec='#e74c3c'))

fig.savefig(os.path.join(OUT, '攻击伤害流程.png'), dpi=150,
            bbox_inches='tight', facecolor='white')
plt.close(fig)
print("[OK] P1-基础战斗/攻击伤害流程.png")
