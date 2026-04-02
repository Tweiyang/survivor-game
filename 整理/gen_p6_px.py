# -*- coding: utf-8 -*-
"""P6 关卡地图 + P7/P8 音频部署 + PX 经验教训 图片生成"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon
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

def diamond(ax, cx, cy, s, txt, c='#1abc9c', tc='white', fs=8):
    verts = [(cx, cy+s), (cx+s*1.3, cy), (cx, cy-s), (cx-s*1.3, cy)]
    p = Polygon(verts, fc=c, ec='#2c3e50', lw=1.5, closed=True)
    ax.add_patch(p)
    ax.text(cx, cy, txt, ha='center', va='center', fontsize=fs, color=tc, fontweight='bold')

def save(fig, folder, name):
    d = os.path.join(BASE, folder)
    os.makedirs(d, exist_ok=True)
    fig.savefig(os.path.join(d, name), dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"[OK] {folder}/{name}")

# ============================================================
# P6 — Boss 门机制流程
# ============================================================
fig, ax = plt.subplots(figsize=(12, 10))
ax.set_xlim(0, 12); ax.set_ylim(0, 10); ax.axis('off')
ax.set_title('P6 - Boss 门机制 & 关卡流程', fontsize=18, fontweight='bold', pad=15)

# 房间拓扑 (顶部)
ax.text(6, 9.5, '-- 关卡房间拓扑 --', ha='center', fontsize=12, color='#7f8c8d')
box(ax, 0.5, 8.3, 2.2, 0.8, 'Start Room\n玩家出生', '#2ecc71', fs=9)
box(ax, 3.5, 8.3, 2.2, 0.8, 'Normal Room\nslime x3', '#3498db', fs=9)
box(ax, 6.5, 8.3, 2.2, 0.8, 'Normal Room\nbat x2', '#3498db', fs=9)
box(ax, 9.5, 8.3, 2.2, 0.8, 'Boss Room\n(锁着的门)', '#e74c3c', fs=9)
arr(ax, 2.7, 8.7, 3.5, 8.7)
arr(ax, 5.7, 8.7, 6.5, 8.7)
arr(ax, 8.7, 8.7, 9.5, 8.7)

# Boss 门流程 (主体)
box(ax, 4.5, 6.8, 3, 0.7, '战斗开始\n怪物生成', '#34495e', fs=10)
arr(ax, 6, 6.8, 6, 6.3)

box(ax, 4.5, 5.5, 3, 0.7, '玩家击杀怪物\ntotalKills++', '#3498db', fs=9)
arr(ax, 6, 5.5, 6, 5.0)

diamond(ax, 6, 4.4, 0.45, 'kills >=\nrequired?', '#e67e22', fs=8)

# 否 -> 循环
ax.annotate('', xy=(4.5, 5.85), xytext=(4.7, 4.4),
    arrowprops=dict(arrowstyle='->', color='#e74c3c', lw=1.5,
                    connectionstyle='arc3,rad=-0.5'))
ax.text(3.5, 5.1, 'NO', fontsize=9, color='#e74c3c', fontweight='bold')

# 是 -> 开门
arr(ax, 7.3, 4.4, 8.5, 4.4, 'YES')
box(ax, 8.5, 4, 3, 0.7, 'onBossGateOpen\n移除门瓦片', '#2ecc71', fs=9)
arr(ax, 10, 4, 10, 3.3)

box(ax, 8.5, 2.5, 3, 0.7, 'activateBossRoom\nBoss 开始生成', '#e67e22', fs=9)
arr(ax, 10, 2.5, 10, 1.9)

box(ax, 8.5, 1.1, 3, 0.7, '击杀 Boss\nlevelComplete!', '#e74c3c', fs=9)

# 左侧: 延迟生成说明
box(ax, 0.3, 3.5, 3.5, 1.5, '', '#ffeaa7', tc='#2c3e50')
ax.text(2.05, 4.65, '延迟生成 (关键!)', fontsize=10, color='#e74c3c', fontweight='bold', ha='center')
ax.text(2.05, 4.15, '门开了才放Boss', fontsize=9, color='#2c3e50', ha='center')
ax.text(2.05, 3.75, '避免AI卡墙', fontsize=9, color='#2c3e50', ha='center')

save(fig, 'P6-关卡地图', 'Boss门机制流程.png')

# ============================================================
# P7/P8 — 部署架构
# ============================================================
fig, ax = plt.subplots(figsize=(14, 8))
ax.set_xlim(0, 14); ax.set_ylim(0, 8); ax.axis('off')
ax.set_title('P7/P8 - 音频系统 & Web 部署架构', fontsize=18, fontweight='bold', pad=15)

# 左半: 音频
ax.add_patch(plt.Rectangle((0.2, 3.5), 5.6, 4, fill=True, fc='#f8f9fa', ec='#9b59b6', lw=1.5, ls='--'))
ax.text(3, 7.2, 'P7 音频系统', ha='center', fontsize=13, color='#9b59b6', fontweight='bold')

box(ax, 0.5, 5.8, 2.2, 0.7, 'BGM Source\n循环播放', '#9b59b6', fs=9)
box(ax, 3.2, 5.8, 2.2, 0.7, 'SFX Source\n多实例并发', '#8e44ad', fs=9)
box(ax, 0.5, 4.5, 2.2, 0.7, 'bgmGain\n音量控制', '#3498db', fs=9)
box(ax, 3.2, 4.5, 2.2, 0.7, 'sfxGain\n音量控制', '#3498db', fs=9)
box(ax, 1.8, 3.6, 2.4, 0.6, 'masterGain\n-> 扬声器', '#e74c3c', fs=9)

arr(ax, 1.6, 5.8, 1.6, 5.2)
arr(ax, 4.3, 5.8, 4.3, 5.2)
arr(ax, 1.6, 4.5, 2.5, 4.2)
arr(ax, 4.3, 4.5, 3.5, 4.2)

# 右半: 部署
ax.add_patch(plt.Rectangle((6.2, 0.5), 7.5, 7, fill=True, fc='#f8f9fa', ec='#2ecc71', lw=1.5, ls='--'))
ax.text(10, 7.2, 'P8 Web 部署架构', ha='center', fontsize=13, color='#2ecc71', fontweight='bold')

box(ax, 6.5, 5.8, 2.5, 0.7, '开发者\ngit push', '#34495e', fs=9)
box(ax, 9.5, 5.8, 2, 0.7, 'GitHub\n仓库', '#2c3e50', fs=9)
arr(ax, 9, 6.15, 9.5, 6.15)

box(ax, 6.5, 4.2, 2.5, 0.7, 'GitHub Pages\n前端静态', '#2ecc71', fs=9)
box(ax, 10, 4.2, 2.5, 0.7, 'Render\n后端服务', '#3498db', fs=9)
arr(ax, 10.5, 5.8, 7.75, 4.9, '自动部署')
arr(ax, 10.5, 5.8, 11.25, 4.9, '自动部署')

box(ax, 8.5, 2.5, 2.5, 0.7, '玩家浏览器', '#e67e22', fs=10)
arr(ax, 9.75, 2.5, 7.75, 3.5, 'HTTPS')
arr(ax, 9.75, 3.2, 11.25, 4.2, 'WSS')

# 底部说明
box(ax, 6.5, 0.8, 6, 0.7, '.nojekyll + meta标签 + CORS + 5s超时降级', '#f39c12', tc='#2c3e50', fs=9)

# 左下: 音频说明
ax.text(3, 2.7, 'Web Audio API\n首次交互后 resume()',
        ha='center', fontsize=9, color='#9b59b6',
        bbox=dict(boxstyle='round', fc='#f5eef8', ec='#9b59b6'))

save(fig, 'P7-音频与P8-部署', '音频与部署架构.png')

# ============================================================
# PX — 踩坑总览 (Bug 地图)
# ============================================================
fig, ax = plt.subplots(figsize=(14, 10))
ax.set_xlim(0, 14); ax.set_ylim(0, 10); ax.axis('off')
ax.set_title('PX - 踩坑与修复总结 (7大Bug)', fontsize=18, fontweight='bold', pad=15)

bugs = [
    ('Bug #1\n双份实体', '匿名函数\noff失败', '预绑定\nbind引用', '#e74c3c'),
    ('Bug #2\nBoss击杀悖论', '客户端\n本地扣血', '联网禁用\n本地伤害', '#e67e22'),
    ('Bug #3\n经验飞速升级', '字段名错\n双重经验', '读正确字段\n去重来源', '#f1c40f'),
    ('Bug #4\n404 JS文件', 'Jekyll\n吞文件', '.nojekyll\n空文件', '#2ecc71'),
    ('Bug #5\n手机按钮失灵', '300ms延迟\nCanvas遮挡', 'touchend\npreventDefault', '#3498db'),
    ('Bug #6\n端口被占用', 'Ghost进程\n没关掉', 'kill旧进程\n再启动', '#9b59b6'),
    ('Bug #7\n血条不动', '属性名\nhp vs currentHp', '统一\n属性映射', '#1abc9c'),
]

for i, (name, cause, fix, color) in enumerate(bugs):
    row = i // 4
    col = i % 4
    x = 0.3 + col * 3.4
    y = 7.5 - row * 3.5
    # Bug名
    box(ax, x, y, 2.8, 0.8, name, color, fs=9)
    # 根因
    box(ax, x, y-1.2, 1.3, 0.8, cause, '#ffebee' if color == '#e74c3c' else '#fff3e0',
        tc='#2c3e50', fs=8)
    ax.text(x+0.65, y-0.2, '根因', ha='center', fontsize=7, color='#e74c3c')
    # 修复
    box(ax, x+1.5, y-1.2, 1.3, 0.8, fix, '#e8f5e9', tc='#2c3e50', fs=8)
    ax.text(x+2.15, y-0.2, '修复', ha='center', fontsize=7, color='#27ae60')
    arr(ax, x+1.3, y-0.8, x+1.5, y-0.8, '', '#27ae60')

# 底部经验法则
ax.text(7, 0.5, '核心法则: 事件必须绑定引用 | 联网不改权威数据 | 配置名必须精确 | 自动化测试防回归',
        ha='center', fontsize=10, color='#e74c3c', fontweight='bold',
        bbox=dict(boxstyle='round', fc='#ffeaa7', ec='#e74c3c'))

save(fig, 'PX-经验教训', '踩坑总览.png')

# ============================================================
# 00-总览: 全项目阶段一览
# ============================================================
fig, ax = plt.subplots(figsize=(14, 6))
ax.set_xlim(0, 14); ax.set_ylim(0, 6); ax.axis('off')
ax.set_title('项目全阶段架构一览', fontsize=18, fontweight='bold', pad=15)

phases = [
    ('P0\n引擎核心', '#e74c3c'),
    ('P1\n基础战斗', '#e67e22'),
    ('P2\n技能系统', '#f1c40f'),
    ('P3\n多角色', '#2ecc71'),
    ('P4\n多端输入', '#1abc9c'),
    ('P5\n联机多人', '#3498db'),
    ('P6\n关卡地图', '#9b59b6'),
    ('P7\n音频系统', '#8e44ad'),
    ('P8\nWeb部署', '#34495e'),
]
bw = 1.3
gap = 0.15
sx = 0.5
for i, (name, color) in enumerate(phases):
    x = sx + i * (bw + gap)
    tc2 = '#2c3e50' if color == '#f1c40f' else 'white'
    box(ax, x, 3.5, bw, 1.2, name, color, tc=tc2, fs=9)
    if i > 0:
        arr(ax, x-gap, 4.1, x, 4.1, '', color)

# 底部: 技术栈
box(ax, 0.5, 1.5, 4, 0.8, 'Canvas 2D + ECS\n自研引擎', '#2c3e50', fs=10)
box(ax, 5, 1.5, 4, 0.8, 'Colyseus + Node.js\n服务端权威', '#0f3460', fs=10)
box(ax, 9.5, 1.5, 4, 0.8, 'GitHub Pages + Render\nWeb 部署', '#27ae60', fs=10)

save(fig, '00-总览', '全阶段架构一览.png')

print("\n=== P6/P7P8/PX/总览 全部完成 ===")
