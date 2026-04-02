# -*- coding: utf-8 -*-
"""P2 技能系统 + P3 多角色 + P4 输入系统 图片生成"""
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
                ha='center', fontsize=8, color='#7f8c8d', style='italic')

def diamond(ax, cx, cy, size, txt, c='#1abc9c', tc='white', fs=8):
    """菱形判定节点"""
    s = size
    verts = [(cx, cy+s), (cx+s, cy), (cx, cy-s), (cx-s, cy), (cx, cy+s)]
    from matplotlib.patches import Polygon
    p = Polygon(verts, fc=c, ec='#2c3e50', lw=1.5)
    ax.add_patch(p)
    ax.text(cx, cy, txt, ha='center', va='center', fontsize=fs, color=tc, fontweight='bold')

def save(fig, folder, name):
    d = os.path.join(BASE, folder)
    os.makedirs(d, exist_ok=True)
    fig.savefig(os.path.join(d, name), dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"[OK] {folder}/{name}")

# ============================================================
# P2 — 技能系统: 技能树 + 升级流程
# ============================================================
fig, ax = plt.subplots(figsize=(14, 9))
ax.set_xlim(0, 14); ax.set_ylim(0, 9); ax.axis('off')
ax.set_title('P2 — 技能系统架构 (数据驱动)', fontsize=18, fontweight='bold', pad=15)

# 顶部: 数据源
box(ax, 5, 7.5, 4, 0.8, 'skills.json\n技能配置数据', '#34495e', fs=11)

# 第二层: SkillManager
box(ax, 5, 5.8, 4, 0.8, 'SkillManager\n技能管理器', '#e74c3c', fs=11)
arr(ax, 7, 7.5, 7, 6.6, '加载解析')

# 第三层: 技能实例
box(ax, 0.5, 4, 2.5, 0.8, '普通攻击\nLv1 → Lv5', '#3498db')
box(ax, 3.5, 4, 2.5, 0.8, '火球术\nLv1 → Lv5', '#e67e22')
box(ax, 6.5, 4, 2.5, 0.8, '冰冻箭\nLv1 → Lv5', '#1abc9c')
box(ax, 9.5, 4, 2.5, 0.8, '闪电链\nLv1 → Lv5', '#9b59b6')

arr(ax, 6, 5.8, 1.75, 4.8, '')
arr(ax, 6.5, 5.8, 4.75, 4.8, '')
arr(ax, 7.5, 5.8, 7.75, 4.8, '')
arr(ax, 8, 5.8, 10.75, 4.8, '')

# 第四层: 升级效果
box(ax, 0.5, 2.2, 3.5, 0.8, '升级 → 伤害倍率 ↑\ncooldown ↓', '#2ecc71', fs=9)
box(ax, 5, 2.2, 3.5, 0.8, '升级 → 投射物数 ↑\n弹道变化', '#2ecc71', fs=9)
box(ax, 9.5, 2.2, 4, 0.8, '升级 → 穿透 / 连锁\n范围变化', '#2ecc71', fs=9)

arr(ax, 1.75, 4, 2.25, 3, '')
arr(ax, 4.75, 4, 6.75, 3, '')
arr(ax, 10.75, 4, 11.5, 3, '')

# 底部说明
box(ax, 2, 0.8, 10, 0.7, '每次升级读 skills.json 的 levels[n] 配置 → 无需硬编码', '#f39c12', tc='#2c3e50', fs=10)

save(fig, 'P2-技能系统', '技能系统架构.png')

# ============================================================
# P3 — 多角色: 三角色对比 + 选人流程
# ============================================================
fig, ax = plt.subplots(figsize=(14, 8))
ax.set_xlim(0, 14); ax.set_ylim(0, 8); ax.axis('off')
ax.set_title('P3 — 多角色系统 (配置化差异)', fontsize=18, fontweight='bold', pad=15)

# 三角色
box(ax, 0.5, 5, 3.8, 2.2, '', '#e74c3c')
ax.text(2.4, 6.8, '⚔️ 战士 Warrior', ha='center', fontsize=12, color='white', fontweight='bold')
ax.text(2.4, 6.2, 'HP: 150  ATK: 12', ha='center', fontsize=9, color='#ffeaa7')
ax.text(2.4, 5.7, '速度: 慢  范围: 近', ha='center', fontsize=9, color='#ffeaa7')
ax.text(2.4, 5.2, '特点: 高血量肉盾', ha='center', fontsize=9, color='#ffeaa7')

box(ax, 5.1, 5, 3.8, 2.2, '', '#3498db')
ax.text(7, 6.8, '🔮 法师 Mage', ha='center', fontsize=12, color='white', fontweight='bold')
ax.text(7, 6.2, 'HP: 80   ATK: 18', ha='center', fontsize=9, color='#ffeaa7')
ax.text(7, 5.7, '速度: 中  范围: 远', ha='center', fontsize=9, color='#ffeaa7')
ax.text(7, 5.2, '特点: 高伤害脆皮', ha='center', fontsize=9, color='#ffeaa7')

box(ax, 9.7, 5, 3.8, 2.2, '', '#2ecc71')
ax.text(11.6, 6.8, '🏹 弓手 Archer', ha='center', fontsize=12, color='white', fontweight='bold')
ax.text(11.6, 6.2, 'HP: 100  ATK: 14', ha='center', fontsize=9, color='#ffeaa7')
ax.text(11.6, 5.7, '速度: 快  范围: 远', ha='center', fontsize=9, color='#ffeaa7')
ax.text(11.6, 5.2, '特点: 均衡远程', ha='center', fontsize=9, color='#ffeaa7')

# 公共配置源
box(ax, 4, 3, 6, 0.8, 'characters.json  ← 所有角色数据来源', '#34495e', fs=11)
arr(ax, 2.4, 5, 5.5, 3.8)
arr(ax, 7, 5, 7, 3.8)
arr(ax, 11.6, 5, 8.5, 3.8)

# 选人流程
box(ax, 0.5, 1, 2.5, 0.8, 'CharSelect\nScene', '#9b59b6')
box(ax, 4, 1, 2.5, 0.8, '点击角色卡\n高亮选中', '#e67e22')
box(ax, 7.5, 1, 2.5, 0.8, '读取 config\n创建实体', '#1abc9c')
box(ax, 11, 1, 2.5, 0.8, '进入 GameScene\n开始战斗', '#e74c3c')
arr(ax, 3, 1.4, 4, 1.4)
arr(ax, 6.5, 1.4, 7.5, 1.4)
arr(ax, 10, 1.4, 11, 1.4)

save(fig, 'P3-多角色', '多角色系统架构.png')

# ============================================================
# P4 — 输入系统: 策略模式 + 虚拟摇杆
# ============================================================
fig, ax = plt.subplots(figsize=(14, 8))
ax.set_xlim(0, 14); ax.set_ylim(0, 8); ax.axis('off')
ax.set_title('P4 — 输入系统 (策略模式)', fontsize=18, fontweight='bold', pad=15)

# InputProvider 接口
box(ax, 5, 6.5, 4, 0.8, 'InputProvider\n(策略接口)', '#34495e', fs=12)

# 两个实现
box(ax, 1, 4.5, 4, 1.2, '⌨️ KeyboardProvider\nWASD / 方向键\n鼠标点击攻击', '#3498db', fs=10)
box(ax, 9, 4.5, 4, 1.2, '📱 TouchProvider\n虚拟摇杆移动\n触控按钮攻击', '#2ecc71', fs=10)

arr(ax, 6, 6.5, 3, 5.7, 'PC')
arr(ax, 8, 6.5, 11, 5.7, '移动端')

# 统一输出
box(ax, 5, 2.5, 4, 0.8, 'getDirection() → {x, y}\ngetAttack() → bool', '#e67e22', tc='#2c3e50', fs=10)
arr(ax, 3, 4.5, 6, 3.3)
arr(ax, 11, 4.5, 8, 3.3)

# 消费者
box(ax, 1, 0.8, 3, 0.8, 'MovementSystem\n读取 direction', '#9b59b6', fs=9)
box(ax, 5.5, 0.8, 3, 0.8, 'CombatSystem\n读取 attack', '#9b59b6', fs=9)
box(ax, 10, 0.8, 3, 0.8, 'PlayerController\n组合调度', '#9b59b6', fs=9)

arr(ax, 6, 2.5, 2.5, 1.6)
arr(ax, 7, 2.5, 7, 1.6)
arr(ax, 8, 2.5, 11.5, 1.6)

# 运行时切换标注
ax.text(7, 8.0 - 0.3, '运行时检测设备 → 自动选择 Provider，无需改业务代码',
        ha='center', fontsize=10, color='#e74c3c', fontweight='bold',
        bbox=dict(boxstyle='round', fc='#ffeaa7', ec='#e74c3c'))

save(fig, 'P4-多端输入', '输入系统架构.png')

print("\n=== P2/P3/P4 全部完成 ===")
