# -*- coding: utf-8 -*-
"""
整理文件夹 - 设计图片生成器
为每个阶段(P0~PX)生成 PNG 架构图/流程图
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import os, sys

# 中文字体设置
plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'Arial']
plt.rcParams['axes.unicode_minus'] = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def save_fig(fig, folder, filename):
    """保存图片到对应文件夹"""
    path = os.path.join(BASE_DIR, folder)
    os.makedirs(path, exist_ok=True)
    full = os.path.join(path, filename)
    fig.savefig(full, dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close(fig)
    print(f"  [OK] {folder}/{filename}")

# ============================================================
# 通用绘图辅助
# ============================================================
def draw_box(ax, x, y, w, h, text, color='#3498db',
             textcolor='white', fontsize=10, radius=0.15):
    """画一个圆角矩形+居中文字"""
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0,rounding_size={radius}",
        facecolor=color, edgecolor='#2c3e50', linewidth=1.5
    )
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2, text,
            ha='center', va='center',
            fontsize=fontsize, color=textcolor,
            fontweight='bold', wrap=True)
    return box

def draw_arrow(ax, x1, y1, x2, y2, color='#2c3e50', style='->', lw=1.5):
    """画箭头"""
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color=color, lw=lw))

def draw_label(ax, x1, y1, x2, y2, text, color='#7f8c8d', fontsize=8):
    """在箭头旁画标签"""
    mx, my = (x1+x2)/2, (y1+y2)/2
    ax.text(mx, my+0.15, text, ha='center', va='bottom',
            fontsize=fontsize, color=color, style='italic')

if __name__ == '__main__':
    print("=== 设计图生成器 ===")
    print("请运行各阶段子脚本，或使用 generate_all.py")
