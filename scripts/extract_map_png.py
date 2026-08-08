from __future__ import annotations

import json
import sys
from pathlib import Path
from PIL import Image


def dark(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a >= 70 and max(r, g, b) <= 110


def runs(values: list[bool], min_length: int = 12, max_gap: int = 1):
    result = []
    start = None
    last_dark = None
    for index, value in enumerate(values + [False] * (max_gap + 1)):
        if value:
            if start is None:
                start = index
            last_dark = index
        elif start is not None and last_dark is not None and index - last_dark > max_gap:
            if last_dark - start + 1 >= min_length:
                result.append((start, last_dark))
            start = None
            last_dark = None
    return result


def cluster_segments(segments: list[tuple[int, int, int]], tolerance: int = 2):
    clusters: list[list[tuple[int, int, int]]] = []
    for segment in sorted(segments):
        axis, start, end = segment
        match = next((cluster for cluster in clusters if abs(axis - cluster[-1][0]) <= tolerance and abs(start - cluster[-1][1]) <= 3 and abs(end - cluster[-1][2]) <= 3), None)
        if match is None:
            clusters.append([segment])
        else:
            match.append(segment)
    return [
        (
            round(sum(item[0] for item in cluster) / len(cluster)),
            round(sum(item[1] for item in cluster) / len(cluster)),
            round(sum(item[2] for item in cluster) / len(cluster)),
        )
        for cluster in clusters
    ]


def coverage_vertical(mask, x: int, y1: int, y2: int, radius: int = 1) -> float:
    hits = 0
    total = max(1, y2 - y1 + 1)
    for y in range(y1, y2 + 1):
        if any(0 <= x + dx < len(mask[0]) and mask[y][x + dx] for dx in range(-radius, radius + 1)):
            hits += 1
    return hits / total


def coverage_horizontal(mask, y: int, x1: int, x2: int, radius: int = 1) -> float:
    hits = 0
    total = max(1, x2 - x1 + 1)
    for x in range(x1, x2 + 1):
        if any(0 <= y + dy < len(mask) and mask[y + dy][x] for dy in range(-radius, radius + 1)):
            hits += 1
    return hits / total


def extract(path: Path):
    image = Image.open(path).convert('RGBA')
    width, height = image.size
    pixels = image.load()
    mask = [[dark(pixels[x, y]) for x in range(width)] for y in range(height)]

    horizontal = []
    for y in range(height):
        for x1, x2 in runs(mask[y], min_length=12, max_gap=1):
            if 10 <= x2 - x1 <= 500:
                horizontal.append((y, x1, x2))
    horizontal = cluster_segments(horizontal)

    vertical = []
    for x in range(width):
        column = [mask[y][x] for y in range(height)]
        for y1, y2 in runs(column, min_length=12, max_gap=1):
            if 10 <= y2 - y1 <= 500:
                vertical.append((x, y1, y2))
    vertical = cluster_segments(vertical)

    rectangles = []
    for index, (top, x1, x2) in enumerate(horizontal):
        if top < 170 or top > 1020:
            continue
        for bottom, bx1, bx2 in horizontal[index + 1:]:
            if bottom - top < 12:
                continue
            if bottom - top > 250:
                break
            if abs(x1 - bx1) > 3 or abs(x2 - bx2) > 3:
                continue
            left_coverage = coverage_vertical(mask, round((x1 + bx1) / 2), top, bottom)
            right_coverage = coverage_vertical(mask, round((x2 + bx2) / 2), top, bottom)
            if left_coverage >= .72 and right_coverage >= .72:
                rectangles.append({
                    'x': round((x1 + bx1) / 2),
                    'y': top,
                    'width': round((x2 + bx2) / 2) - round((x1 + bx1) / 2),
                    'height': bottom - top,
                    'leftCoverage': round(left_coverage, 3),
                    'rightCoverage': round(right_coverage, 3),
                })

    # Remove duplicates and containers that merely repeat the same border.
    unique = {}
    for rect in rectangles:
        key = (rect['x'], rect['y'], rect['width'], rect['height'])
        unique[key] = rect
    rectangles = sorted(unique.values(), key=lambda item: (item['y'], item['x'], item['width'], item['height']))
    atomic = []
    horizontal_axes = sorted(set(
        value for item in rectangles for value in (item['y'], item['y'] + item['height'])
        if 170 <= value <= 1020
    ))
    for top_index, top in enumerate(horizontal_axes):
        for bottom in horizontal_axes[top_index + 1:]:
            if bottom - top < 12:
                continue
            if bottom - top > 220:
                break
            xs = sorted(set(x for x, y1, y2 in vertical if y1 <= top + 2 and y2 >= bottom - 2))
            for x1, x2 in zip(xs, xs[1:]):
                if x2 - x1 < 8 or x2 - x1 > 450:
                    continue
                top_line = any(abs(axis - top) <= 2 and start <= x1 + 2 and end >= x2 - 2 for axis, start, end in horizontal)
                bottom_line = any(abs(axis - bottom) <= 2 and start <= x1 + 2 and end >= x2 - 2 for axis, start, end in horizontal)
                if top_line and bottom_line:
                    atomic.append({
                        'x': x1, 'y': top, 'width': x2 - x1, 'height': bottom - top,
                        'topCoverage': 1, 'bottomCoverage': 1
                    })
    atomic_unique = {(item['x'], item['y'], item['width'], item['height']): item for item in atomic}
    atomic = sorted(atomic_unique.values(), key=lambda item: (item['y'], item['x'], item['width'], item['height']))
    canonical = []
    for item in atomic:
        match = next((other for other in canonical if all(abs(item[key] - other[key]) <= 3 for key in ('x', 'y', 'width', 'height'))), None)
        if match is None:
            canonical.append(dict(item))
        else:
            for key in ('x', 'y', 'width', 'height'):
                match[key] = round((match[key] + item[key]) / 2)

    leaf = []
    for item in canonical:
        x1, y1 = item['x'], item['y']
        x2, y2 = x1 + item['width'], y1 + item['height']
        children = [other for other in canonical if other is not item and other['x'] >= x1 - 2 and other['y'] >= y1 - 2 and other['x'] + other['width'] <= x2 + 2 and other['y'] + other['height'] <= y2 + 2 and other['width'] * other['height'] < item['width'] * item['height'] * .8]
        child_area = sum(other['width'] * other['height'] for other in children)
        if len(children) >= 2 and child_area >= item['width'] * item['height'] * .45:
            continue
        leaf.append(item)
    return {
        'width': width,
        'height': height,
        'horizontalSegments': len(horizontal),
        'verticalSegments': len(vertical),
        'rectangles': rectangles,
        'atomicRectangles': atomic,
        'leafRectangles': sorted(leaf, key=lambda item: (item['y'], item['x'])),
    }


if __name__ == '__main__':
    source = Path(sys.argv[1] if len(sys.argv) > 1 else 'public/mapa/mapa-guia-2d.png')
    result = json.dumps(extract(source), ensure_ascii=False, indent=2)
    if len(sys.argv) > 2:
        Path(sys.argv[2]).write_text(result, encoding='utf-8')
    else:
        print(result)
