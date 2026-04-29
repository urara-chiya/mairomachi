/**
 * 图片处理工具
 *
 * 提供轮廓图 tint、缩放等客户端图像处理函数。
 */

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '')
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}

/**
 * 对 WG 舰船轮廓图进行 tint 处理。
 *
 * 处理规则：
 * - 先采样图片中心偏底部像素作为"填充参考色"
 * - 纯白背景 → 透明
 * - 与填充参考色接近的像素 → 替换为指定的 tintColor
 * - 黑色轮廓线 → 保持原色
 *
 * @param url       - 原始轮廓图 URL
 * @param tintColor - 目标填充色（hex 格式，如 '#ADC9CC'）
 * @returns Promise<string> - 处理后的图片 Data URL，失败时返回原始 url
 */
export function tintContourImage(url: string, tintColor: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      // 水平拉伸 1.5 倍，让轮廓图更扁长
      canvas.width = Math.round((img.naturalWidth || 163) * 1.5)
      canvas.height = img.naturalHeight || 48
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(url)
        return
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      const [tr, tg, tb] = hexToRgb(tintColor)

      // 采样中心偏底部像素作为填充参考色（中心轴，底部往上第 10 个像素）
      const sampleX = Math.floor(canvas.width / 2)
      const sampleY = Math.max(0, canvas.height - 10)
      const sampleIdx = (sampleY * canvas.width + sampleX) * 4
      const sr = data[sampleIdx]
      const sg = data[sampleIdx + 1]
      const sb = data[sampleIdx + 2]

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]

        if (a === 0) continue

        const brightness = 0.299 * r + 0.587 * g + 0.114 * b

        // 纯白背景 → 透明
        if (brightness > 240) {
          data[i + 3] = 0
          continue
        }

        // 与采样填充色接近的像素 → 替换为目标色
        const dist = Math.sqrt((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2)
        if (dist < 40) {
          data[i] = tr
          data[i + 1] = tg
          data[i + 2] = tb
          continue
        }

        // 其他（黑色轮廓及抗锯齿边缘）保持原色
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }

    img.onerror = () => resolve(url)
    img.src = url
  })
}
