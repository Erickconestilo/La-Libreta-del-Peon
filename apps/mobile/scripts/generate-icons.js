const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT_DIR = path.resolve(__dirname, '..', 'assets', 'images');

const COLORS = {
  backgroundA: '#071116',
  backgroundB: '#0F2C36',
  backgroundC: '#123F49',
  black: '#030507',
  blue: '#08A9D6',
  blueDark: '#057C9F',
  blueDeep: '#063D51',
  cyan: '#2FD8F2',
  metal: '#C9D2D6',
  orange: '#FF7A00',
  red: '#BC1109',
  shadow: '#000000',
  white: '#F6FAF7',
};

function hexToRgba(hex, alpha = 255) {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    alpha,
  ];
}

function mixColor(a, b, t, alpha = 255) {
  const ca = hexToRgba(a);
  const cb = hexToRgba(b);
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.round(ca[0] + (cb[0] - ca[0]) * clamped),
    Math.round(ca[1] + (cb[1] - ca[1]) * clamped),
    Math.round(ca[2] + (cb[2] - ca[2]) * clamped),
    alpha,
  ];
}

function createCanvas(size, transparent = true) {
  const png = new PNG({ width: size, height: size });
  if (!transparent) {
    fillRect(png, 0, 0, size, size, hexToRgba(COLORS.backgroundA));
  }
  return png;
}

function blendPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;

  const index = (Math.floor(y) * png.width + Math.floor(x)) * 4;
  const srcA = color[3] / 255;
  if (srcA <= 0) return;

  const dstA = png.data[index + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  const write = (channel) => {
    if (outA === 0) return 0;
    return Math.round((color[channel] * srcA + png.data[index + channel] * dstA * (1 - srcA)) / outA);
  };

  png.data[index] = write(0);
  png.data[index + 1] = write(1);
  png.data[index + 2] = write(2);
  png.data[index + 3] = Math.round(outA * 255);
}

function fillRect(png, x0, y0, width, height, color) {
  const minX = Math.max(0, Math.floor(x0));
  const minY = Math.max(0, Math.floor(y0));
  const maxX = Math.min(png.width, Math.ceil(x0 + width));
  const maxY = Math.min(png.height, Math.ceil(y0 + height));
  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      blendPixel(png, x, y, color);
    }
  }
}

function fillBackground(png) {
  const cx = png.width * 0.48;
  const cy = png.height * 0.46;
  const maxRadius = png.width * 0.7;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const diagonal = (x + y) / (png.width + png.height);
      const radial = Math.min(1, Math.hypot(x - cx, y - cy) / maxRadius);
      let color = mixColor(COLORS.backgroundA, COLORS.backgroundB, diagonal);
      color = [
        Math.round(color[0] * (1 - radial * 0.38)),
        Math.round(color[1] * (1 - radial * 0.33)),
        Math.round(color[2] * (1 - radial * 0.28)),
        255,
      ];
      const accent = Math.max(0, 1 - Math.hypot(x - png.width * 0.78, y - png.height * 0.18) / (png.width * 0.55));
      color[0] = Math.round(color[0] + (hexToRgba(COLORS.backgroundC)[0] - color[0]) * accent * 0.22);
      color[1] = Math.round(color[1] + (hexToRgba(COLORS.backgroundC)[1] - color[1]) * accent * 0.22);
      color[2] = Math.round(color[2] + (hexToRgba(COLORS.backgroundC)[2] - color[2]) * accent * 0.22);

      const index = (y * png.width + x) * 4;
      png.data[index] = color[0];
      png.data[index + 1] = color[1];
      png.data[index + 2] = color[2];
      png.data[index + 3] = 255;
    }
  }
}

function drawCircle(png, cx, cy, radius, color) {
  const r2 = radius * radius;
  const minX = Math.max(0, Math.floor(cx - radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxX = Math.min(png.width - 1, Math.ceil(cx + radius));
  const maxY = Math.min(png.height - 1, Math.ceil(cy + radius));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) {
        blendPixel(png, x, y, color);
      }
    }
  }
}

function drawRing(png, cx, cy, outerRadius, innerRadius, color) {
  const outer2 = outerRadius * outerRadius;
  const inner2 = innerRadius * innerRadius;
  const minX = Math.max(0, Math.floor(cx - outerRadius));
  const minY = Math.max(0, Math.floor(cy - outerRadius));
  const maxX = Math.min(png.width - 1, Math.ceil(cx + outerRadius));
  const maxY = Math.min(png.height - 1, Math.ceil(cy + outerRadius));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= outer2 && d2 >= inner2) {
        blendPixel(png, x, y, color);
      }
    }
  }
}

function drawLine(png, x1, y1, x2, y2, width, color) {
  const half = width / 2;
  const minX = Math.max(0, Math.floor(Math.min(x1, x2) - half));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2) - half));
  const maxX = Math.min(png.width - 1, Math.ceil(Math.max(x1, x2) + half));
  const maxY = Math.min(png.height - 1, Math.ceil(Math.max(y1, y2) + half));
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
      const qx = x1 + t * dx;
      const qy = y1 + t * dy;
      if (Math.hypot(px - qx, py - qy) <= half) {
        blendPixel(png, x, y, color);
      }
    }
  }
  drawCircle(png, x1, y1, half, color);
  drawCircle(png, x2, y2, half, color);
}

function fillPolygon(png, points, color) {
  const minX = Math.max(0, Math.floor(Math.min(...points.map((p) => p[0]))));
  const minY = Math.max(0, Math.floor(Math.min(...points.map((p) => p[1]))));
  const maxX = Math.min(png.width - 1, Math.ceil(Math.max(...points.map((p) => p[0]))));
  const maxY = Math.min(png.height - 1, Math.ceil(Math.max(...points.map((p) => p[1]))));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const xi = points[i][0];
        const yi = points[i][1];
        const xj = points[j][0];
        const yj = points[j][1];
        const intersect = yi > y + 0.5 !== yj > y + 0.5
          && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      if (inside) blendPixel(png, x, y, color);
    }
  }
}

function point(cx, cy, angle, radius) {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}

function drawCompassPoint(png, cx, cy, angle, apexRadius, baseRadius, halfWidth, color) {
  const apex = point(cx, cy, angle, apexRadius);
  const base = point(cx, cy, angle, baseRadius);
  const px = Math.cos(angle + Math.PI / 2) * halfWidth;
  const py = Math.sin(angle + Math.PI / 2) * halfWidth;
  fillPolygon(png, [apex, [base[0] + px, base[1] + py], [base[0] - px, base[1] - py]], color);
}

function drawNeedle(png, cx, cy, radius, mode) {
  const angle = -Math.PI / 4;
  const normal = angle + Math.PI / 2;
  const width = radius * 0.17;
  const frontApex = point(cx, cy, angle, radius * 0.79);
  const backApex = point(cx, cy, angle + Math.PI, radius * 0.74);
  const left = [cx + Math.cos(normal) * width, cy + Math.sin(normal) * width];
  const right = [cx - Math.cos(normal) * width, cy - Math.sin(normal) * width];

  if (mode === 'mono') {
    fillPolygon(png, [frontApex, left, right], hexToRgba(COLORS.white, 255));
    fillPolygon(png, [backApex, left, right], hexToRgba(COLORS.white, 210));
    return;
  }

  fillPolygon(png, [frontApex, left, right], hexToRgba(COLORS.black, 85));
  fillPolygon(png, [[frontApex[0] - radius * 0.015, frontApex[1] + radius * 0.035], left, right], hexToRgba(COLORS.metal, 255));
  fillPolygon(png, [backApex, left, right], hexToRgba(COLORS.red, 255));
  fillPolygon(png, [backApex, left, [cx, cy]], hexToRgba(COLORS.orange, 255));
}

function drawCompass(png, options = {}) {
  const size = png.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * (options.radiusRatio || 0.34);
  const mono = options.mode === 'mono';
  const white = hexToRgba(COLORS.white, mono ? 255 : 245);

  if (!mono) {
    drawCircle(png, cx + size * 0.022, cy + size * 0.034, radius * 1.12, hexToRgba(COLORS.shadow, 78));
    drawCircle(png, cx, cy, radius * 1.08, hexToRgba(COLORS.white, 255));
    drawCircle(png, cx, cy, radius * 0.98, hexToRgba(COLORS.metal, 255));
    drawCircle(png, cx, cy, radius * 0.88, hexToRgba(COLORS.blue, 255));
    drawCircle(png, cx, cy + radius * 0.1, radius * 0.66, hexToRgba(COLORS.blueDark, 168));
    drawRing(png, cx, cy, radius * 0.9, radius * 0.83, hexToRgba(COLORS.blueDeep, 130));
  } else {
    drawRing(png, cx, cy, radius * 1.03, radius * 0.82, white);
  }

  const pointColor = mono ? white : hexToRgba(COLORS.white, 255);
  const secondaryPointColor = mono ? hexToRgba(COLORS.white, 190) : hexToRgba('#D8EFF0', 235);
  for (let i = 0; i < 8; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 4;
    const cardinal = i % 2 === 0;
    drawCompassPoint(
      png,
      cx,
      cy,
      angle,
      radius * (cardinal ? 0.78 : 0.68),
      radius * (cardinal ? 0.29 : 0.35),
      radius * (cardinal ? 0.105 : 0.075),
      cardinal ? pointColor : secondaryPointColor,
    );
  }

  if (!mono) {
    drawRing(png, cx, cy, radius * 0.54, radius * 0.39, hexToRgba(COLORS.white, 255));
    drawCircle(png, cx, cy, radius * 0.34, hexToRgba(COLORS.blueDark, 210));
  }

  drawNeedle(png, cx, cy, radius, mono ? 'mono' : 'color');

  if (mono) {
    drawCircle(png, cx, cy, radius * 0.16, hexToRgba(COLORS.white, 255));
    drawCircle(png, cx, cy, radius * 0.08, [0, 0, 0, 0]);
  } else {
    drawCircle(png, cx, cy, radius * 0.16, hexToRgba('#EEF3F2', 255));
    drawCircle(png, cx, cy, radius * 0.115, hexToRgba('#8B979B', 255));
    drawCircle(png, cx, cy, radius * 0.075, hexToRgba(COLORS.white, 255));
  }
}

function drawSubtleMapLines(png) {
  const color = hexToRgba(COLORS.cyan, 28);
  for (let i = -2; i < 6; i += 1) {
    const offset = png.width * (0.08 + i * 0.18);
    drawLine(png, offset, png.height * 0.12, offset + png.width * 0.76, png.height * 0.88, png.width * 0.008, color);
  }
  drawRing(png, png.width * 0.5, png.height * 0.5, png.width * 0.42, png.width * 0.415, hexToRgba(COLORS.white, 30));
}

function downsample(source, finalSize, scale) {
  const output = new PNG({ width: finalSize, height: finalSize });
  const area = scale * scale;
  for (let y = 0; y < finalSize; y += 1) {
    for (let x = 0; x < finalSize; x += 1) {
      const totals = [0, 0, 0, 0];
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const index = ((y * scale + sy) * source.width + (x * scale + sx)) * 4;
          totals[0] += source.data[index];
          totals[1] += source.data[index + 1];
          totals[2] += source.data[index + 2];
          totals[3] += source.data[index + 3];
        }
      }
      const outIndex = (y * finalSize + x) * 4;
      output.data[outIndex] = Math.round(totals[0] / area);
      output.data[outIndex + 1] = Math.round(totals[1] / area);
      output.data[outIndex + 2] = Math.round(totals[2] / area);
      output.data[outIndex + 3] = Math.round(totals[3] / area);
    }
  }
  return output;
}

function generate(size, fileName, draw, scale = 3) {
  const canvas = createCanvas(size * scale, true);
  draw(canvas);
  const output = downsample(canvas, size, scale);
  fs.writeFileSync(path.join(OUT_DIR, fileName), PNG.sync.write(output));
}

function generateFullIcon(size, fileName, scale = 3) {
  generate(size, fileName, (canvas) => {
    fillBackground(canvas);
    drawSubtleMapLines(canvas);
    drawCompass(canvas, { radiusRatio: 0.34 });
  }, scale);
}

function generateForeground(size, fileName, scale = 3) {
  generate(size, fileName, (canvas) => {
    drawCompass(canvas, { radiusRatio: 0.32 });
  }, scale);
}

function generateBackground(size, fileName, scale = 3) {
  generate(size, fileName, (canvas) => {
    fillBackground(canvas);
    drawSubtleMapLines(canvas);
  }, scale);
}

function generateMonochrome(size, fileName, scale = 3) {
  generate(size, fileName, (canvas) => {
    drawCompass(canvas, { radiusRatio: 0.36, mode: 'mono' });
  }, scale);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
generateFullIcon(1024, 'icon.png', 3);
generateForeground(512, 'android-icon-foreground.png', 4);
generateBackground(512, 'android-icon-background.png', 3);
generateMonochrome(432, 'android-icon-monochrome.png', 4);
generateForeground(1024, 'splash-icon.png', 3);
generateFullIcon(48, 'favicon.png', 6);

console.log('Generated TopoField app icons in assets/images.');
